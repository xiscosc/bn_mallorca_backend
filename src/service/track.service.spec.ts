import { mock } from 'jest-mock-extended'
import { when } from 'jest-when'
import { TrackService } from './track.service'
import { albumArtUrlToBuffer } from '../helpers/album-art.helper'
import { getTrackId, getTrackTs, isBNTrack } from '../helpers/track.helper'
import { triggerAsyncLambda } from '../net/lambda'
import { getAlbumArtWithSignedUrl, storeAlbumArtInS3 } from '../net/s3'
import { publishToSns } from '../net/sns'
import { getAlbumArtFromSpotify } from '../net/spotify'
import { AlbumArtRepository } from '../repository/album-art.repository'
import { TrackListRepository } from '../repository/track-list.repository'
import { AlbumArt, Track, TrackDto } from '../types/components'

jest.mock('../repository/album-art.repository')
jest.mock('../repository/track-list.repository')
jest.mock('../helpers/album-art.helper')
jest.mock('../helpers/track.helper')
jest.mock('../net/s3')
jest.mock('../net/spotify')
jest.mock('../net/lambda')
jest.mock('../net/sns')

const id = '123456'
const ts = 123456
const sizes = ['1x1', '2x2']
const centovaTrack: Track = { name: 'n', artist: 'a' }
const dtoTrack: TrackDto = { ...centovaTrack, id, timestamp: ts, radio: 'BNMALLORCA' }

beforeEach(() => {
  jest.clearAllMocks()
  when(getTrackId).mockReturnValue(id)
  when(getTrackTs).mockReturnValue(ts)
})

test('album is not cached executed when there are is no album art', async () => {
  const service = new TrackService()
  await service.cacheAlbumArt([], 'id1')
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(0)
  expect(storeAlbumArtInS3).toBeCalledTimes(0)
  expect(albumArtUrlToBuffer).toBeCalledTimes(0)
})

test('album is not cached when album art can not be downloaded', async () => {
  when(albumArtUrlToBuffer).mockResolvedValue(undefined)

  const service = new TrackService()
  await service.cacheAlbumArt([getArt(id, sizes[0]!!), getArt(id, sizes[1]!!)], id)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(0)
  expect(storeAlbumArtInS3).toBeCalledTimes(0)
  expect(albumArtUrlToBuffer).toBeCalledTimes(2)
})

test('album is cached', async () => {
  when(albumArtUrlToBuffer).mockResolvedValue(mock<Buffer>())
  const service = new TrackService()
  await service.cacheAlbumArt([getArt(id, sizes[0]!!), getArt(id, sizes[1]!!)], id)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledTimes(1)
  expect(AlbumArtRepository.prototype.addAlbumArt).toBeCalledWith({ id, sizes })
  expect(storeAlbumArtInS3).toBeCalledTimes(2)
  expect(albumArtUrlToBuffer).toBeCalledTimes(2)
})

test('processed track is an ad from bn radio', async () => {
  when(isBNTrack).mockReturnValue(true)

  const service = new TrackService()
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(0)
  expect(getAlbumArtFromSpotify).toBeCalledTimes(0)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithSignedUrl).toBeCalledTimes(0)
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
  when(getAlbumArtWithSignedUrl).mockImplementation(async (t, s) => {
    return getArt(t, s)
  })

  const fullTrack = getFullTrack(sizes.map(s => getArt(id, s)))
  const service = new TrackService()
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getAlbumArtFromSpotify).toBeCalledTimes(0)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithSignedUrl).toBeCalledTimes(2)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - obtained from spotify', async () => {
  const spotifyArt = sizes.map(s => getArt(id, s))
  const fullTrack = getFullTrack(spotifyArt)

  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getAlbumArtFromSpotify).mockResolvedValue(spotifyArt)

  const service = new TrackService()
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getAlbumArtFromSpotify).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledWith(expect.stringContaining(''), fullTrack)
  expect(getAlbumArtWithSignedUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
})

test('processed track has no cached album art - no results from spotify', async () => {
  when(isBNTrack).mockReturnValue(false)
  when(AlbumArtRepository.prototype.getAlbumArt).mockResolvedValue(undefined)
  when(getAlbumArtFromSpotify).mockResolvedValue([])

  const fullTrack = getFullTrack([])
  const service = new TrackService()
  const resultTrack = await service.processTrack(centovaTrack)
  expect(AlbumArtRepository.prototype.getAlbumArt).toBeCalledTimes(1)
  expect(getAlbumArtFromSpotify).toBeCalledTimes(1)
  expect(triggerAsyncLambda).toBeCalledTimes(0)
  expect(getAlbumArtWithSignedUrl).toBeCalledTimes(0)
  expect(publishToSns).toBeCalledTimes(1)
  expect(publishToSns).toBeCalledWith(expect.stringContaining(''), JSON.stringify(fullTrack))
  expect(TrackListRepository.prototype.putTrack).toBeCalledTimes(1)
  expect(TrackListRepository.prototype.putTrack).toBeCalledWith(dtoTrack)
  expect(resultTrack).toEqual(fullTrack)
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
