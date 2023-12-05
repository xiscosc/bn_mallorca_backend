import { SearchResults } from '@spotify/web-api-ts-sdk'
import { mock } from 'jest-mock-extended'
import { when } from 'jest-when'
import { TrackService } from './track.service'
import { getTrackId, getTrackTs, isBNTrack } from '../helpers/track.helper'
import { albumArtUrlToBuffer } from '../net/album-art.downloader'
import { triggerAsyncLambda } from '../net/lambda'
import { getAlbumArtWithUrl, storeAlbumArtInS3 } from '../net/s3'
import { publishToSns } from '../net/sns'
import { getSpotifyResults } from '../net/spotify'
import { AlbumArtRepository } from '../repository/album-art.repository'
import { TrackListRepository } from '../repository/track-list.repository'
import { AlbumArt, Track, TrackList } from '../types/components'
import { AlbumArtDto, TrackDto } from '../types/components.dto'

jest.mock('../repository/album-art.repository')
jest.mock('../repository/track-list.repository')
jest.mock('../helpers/track.helper')
jest.mock('../net/s3')
jest.mock('../net/spotify')
jest.mock('../net/lambda')
jest.mock('../net/sns')
jest.mock('../net/album-art.downloader')

const id = '123456'
const ts = 123456
const sizes = ['1x1', '2x2']
const centovaTrack: Track = { name: `Sweet Child O' Mine`, artist: `Guns N' Roses` }
const dtoTrack: TrackDto = { ...centovaTrack, id, timestamp: ts, radio: 'BNMALLORCA', deleteTs: ts + 60 * 60 * 24 * 15 }
const dtoArt: AlbumArtDto = { id, sizes }
const service = new TrackService()

beforeEach(() => {
  jest.clearAllMocks()
  when(getTrackId).mockReturnValue(id)
  when(getTrackTs).mockReturnValue(ts)
  when(getAlbumArtWithUrl).mockImplementation(async (t, s) => getArt(t, s))
  when(TrackListRepository.getPartitionKeyValue).mockReturnValue('BNMALLORCA')
})

test('album is not cached executed when there are is no album art', async () => {
  await service.cacheAlbumArt([], 'id1')
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(0)
  expect(storeAlbumArtInS3).toBeCalledTimes(0)
  expect(albumArtUrlToBuffer).toBeCalledTimes(0)
})

test('album is not cached when album art can not be downloaded', async () => {
  when(albumArtUrlToBuffer).mockResolvedValue(undefined)
  await service.cacheAlbumArt([getArt(id, sizes[0]!!), getArt(id, sizes[1]!!)], id)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(0)
  expect(storeAlbumArtInS3).toBeCalledTimes(0)
  expect(albumArtUrlToBuffer).toBeCalledTimes(2)
})

test('album is cached', async () => {
  when(albumArtUrlToBuffer).mockResolvedValue(mock<Buffer>())
  await service.cacheAlbumArt([getArt(id, sizes[0]!!), getArt(id, sizes[1]!!)], id)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(1)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledWith({ id, sizes })
  expect(storeAlbumArtInS3).toBeCalledTimes(2)
  expect(albumArtUrlToBuffer).toBeCalledTimes(2)
})

test('processed track is an ad from bn radio', async () => {
  when(isBNTrack).mockReturnValue(true)

  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(0)
  expect(getSpotifyResults).toBeCalledTimes(0)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(getFullTrack([])))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(getFullTrack([]))
})

test('processed track has cached album art', async () => {
  when(isBNTrack).mockReturnValue(false)
  const albumArtDto = { id, sizes }
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(albumArtDto)

  const fullTrack = getFullTrack(sizes.map(s => getArt(id, s)))
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getSpotifyResults).toBeCalledTimes(0)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(2)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - no good results from spotify', async () => {
  const spotifyTracksPage = {
    items: [
      {
        album: {
          album_type: 'album',
          artists: [
            {
              name: 'The Rolling Stones',
              type: 'artist',
            },
          ],
          available_markets: [],
          images: [
            {
              height: 7,
              url: `http://123453333/7x7`,
              width: 7,
            },
            {
              height: 9,
              url: `http://123453333/9x9`,
              width: 9,
            },
          ],
          name: 'Aftermath',
          type: 'album',
        },
        artists: [
          {
            name: 'The Rolling Stones',
            type: 'artist',
          },
        ],
        name: 'Paint It, Black',
      },
    ],
  }

  // @ts-ignore
  const spotifyResults: SearchResults = { tracks: spotifyTracksPage }
  const fullTrack = getFullTrack([])

  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getSpotifyResults).mockResolvedValue(spotifyResults)

  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getSpotifyResults).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - obtained from spotify', async () => {
  const spotifyTracksPage = {
    items: [
      {
        album: {
          album_type: 'album',
          artists: [
            {
              name: 'The Rolling Stones',
              type: 'artist',
            },
          ],
          available_markets: [],
          images: [
            {
              height: 7,
              url: `http://123453333/7x7`,
              width: 7,
            },
            {
              height: 9,
              url: `http://123453333/9x9`,
              width: 9,
            },
          ],
          name: 'Aftermath',
          type: 'album',
        },
        artists: [
          {
            name: 'The Rolling Stones',
            type: 'artist',
          },
        ],
        name: 'Paint It, Black',
      },
      {
        album: {
          album_type: 'album',
          artists: [
            {
              name: "Guns N' Roses",
              type: 'artist',
            },
          ],
          available_markets: [],
          images: [
            {
              height: 1,
              url: `http://${id}/1x1`,
              width: 1,
            },
            {
              height: 2,
              url: `http://${id}/2x2`,
              width: 2,
            },
          ],
          name: 'Appetite For Destruction',
          type: 'album',
        },
        artists: [
          {
            name: "Guns N' Roses",
            type: 'artist',
            uri: 'spotify:artist:3qm84nBOXUEQ2vnTfUTTFC',
          },
        ],
        name: "Sweet Child O' Mine",
      },
    ],
  }

  // @ts-ignore
  const spotifyResults: SearchResults = { tracks: spotifyTracksPage }
  const spotifyArt = sizes.map(s => getArt(id, s))
  const fullTrack = getFullTrack(spotifyArt)

  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getSpotifyResults).mockResolvedValue(spotifyResults)

  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getSpotifyResults).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledWith(expect.stringContaining(''), fullTrack)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - obtained from spotify with a collab', async () => {
  const spotifyTracksPage = {
    items: [
      {
        album: {
          album_type: 'album',
          artists: [
            {
              name: "Guns N' Roses & Other artist collab",
              type: 'artist',
            },
          ],
          available_markets: [],
          images: [
            {
              height: 1,
              url: `http://${id}/1x1`,
              width: 1,
            },
            {
              height: 2,
              url: `http://${id}/2x2`,
              width: 2,
            },
          ],
          name: 'Appetite For Destruction',
          type: 'album',
        },
        artists: [
          {
            name: "Guns N' Roses & Other artist collab",
            type: 'artist',
            uri: 'spotify:artist:3qm84nBOXUEQ2vnTfUTTFC',
          },
        ],
        name: "Sweet Child O' Mine",
      },
    ],
  }

  // @ts-ignore
  const spotifyResults: SearchResults = { tracks: spotifyTracksPage }
  const spotifyArt = sizes.map(s => getArt(id, s))
  const fullTrack = getFullTrack(spotifyArt)

  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getSpotifyResults).mockResolvedValue(spotifyResults)

  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getSpotifyResults).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledWith(expect.stringContaining(''), fullTrack)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - no results from spotify', async () => {
  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getSpotifyResults).mockResolvedValue(undefined)

  const fullTrack = getFullTrack([])
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getSpotifyResults).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('gettting track list - invalid limit value', async () => {
  await expect(service.getTrackList(-1)).rejects.toThrow('Limit is not between 1 and 25')
  await expect(service.getTrackList(0)).rejects.toThrow('Limit is not between 1 and 25')
  await expect(service.getTrackList(26)).rejects.toThrow('Limit is not between 1 and 25')
})

test('gettting track list - no data in db', async () => {
  when(TrackListRepository.prototype.getLastTracks).mockResolvedValue([])
  const result = await service.getTrackList(25)
  expect(result.length).toEqual(0)
  expect(isBNTrack).toBeCalledTimes(0)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
})

test('getting track list - bn mallorca track', async () => {
  when(isBNTrack).mockReturnValue(true)
  when(TrackListRepository.prototype.getLastTracks).mockResolvedValue([dtoTrack])
  const result: TrackList = await service.getTrackList(25)
  expect(result.length).toEqual(1)
  const resultTrack: Track = result[0]!!
  expect(resultTrack.id).toEqual(id)
  expect(resultTrack.timestamp).toEqual(ts)
  expect(resultTrack.name).toEqual(centovaTrack.name)
  expect(resultTrack.artist).toEqual(centovaTrack.artist)
  expect(resultTrack.albumArt!!.length).toEqual(0)
  expect(isBNTrack).toBeCalledTimes(1)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(0)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
})

test('getting track list - normal track without album art', async () => {
  when(isBNTrack).mockReturnValue(false)
  when(TrackListRepository.prototype.getLastTracks).mockResolvedValue([dtoTrack])
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  const result: TrackList = await service.getTrackList(4)
  expect(result.length).toEqual(1)
  const resultTrack: Track = result[0]!!
  expect(resultTrack.id).toEqual(id)
  expect(resultTrack.timestamp).toEqual(ts)
  expect(resultTrack.name).toEqual(centovaTrack.name)
  expect(resultTrack.artist).toEqual(centovaTrack.artist)
  expect(resultTrack.albumArt!!.length).toEqual(0)
  expect(isBNTrack).toBeCalledTimes(1)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getAlbumArtWithUrl).toBeCalledTimes(0)
})

test('getting track list - normal track with album art', async () => {
  when(isBNTrack).mockReturnValue(false)
  when(TrackListRepository.prototype.getLastTracks).mockResolvedValue([dtoTrack])
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(dtoArt)
  const result: TrackList = await service.getTrackList(25)
  expect(result.length).toEqual(1)
  const resultTrack: Track = result[0]!!
  expect(resultTrack.id).toEqual(id)
  expect(resultTrack.timestamp).toEqual(ts)
  expect(resultTrack.name).toEqual(centovaTrack.name)
  expect(resultTrack.artist).toEqual(centovaTrack.artist)
  const albumArt = resultTrack.albumArt!!
  expect(albumArt.length).toEqual(sizes.length)
  expect(albumArt[0]!!.size).toEqual(sizes[0])
  expect(albumArt[1]!!.size).toEqual(sizes[1])
  expect(albumArt[0]!!.downloadUrl).not.toBeNaN()
  expect(albumArt[0]!!.downloadUrl).not.toBeUndefined()
  expect(albumArt[1]!!.downloadUrl).not.toBeNaN()
  expect(albumArt[1]!!.downloadUrl).not.toBeUndefined()
  expect(isBNTrack).toBeCalledTimes(1)

  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getAlbumArtWithUrl).toBeCalledTimes(2)
})

function getArt(trackId: string, size: string): AlbumArt {
  return {
    downloadUrl: `http://${trackId}/${size}`,
    size,
  }
}

function getFullTrack(albumArt: AlbumArt[]): Track {
  return { ...centovaTrack, id, timestamp: ts, albumArt }
}
