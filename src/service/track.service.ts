import { Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'
import { env } from '../config/env'
import { getTrackId, getTrackTs, isBNTrack } from '../helpers/track.helper'
import { albumArtUrlToBuffer } from '../net/album-art.downloader'
import { getCurrentTrackFromCentova } from '../net/centova.downloader'
import { triggerAsyncLambda } from '../net/lambda'
import { getAlbumArtWithUrl, storeAlbumArtInS3 } from '../net/s3'
import { publishToSns } from '../net/sns'
import { getSpotifyResults } from '../net/spotify'
import { AlbumArtRepository } from '../repository/album-art.repository'
import { TrackListRepository } from '../repository/track-list.repository'
import { AlbumArt, Track, TrackList } from '../types/components'
import { AlbumArtDto, TrackDto } from '../types/components.dto'

export class TrackService {
  private albumArtRepository: AlbumArtRepository
  private trackListRepository: TrackListRepository

  constructor() {
    this.albumArtRepository = new AlbumArtRepository()
    this.trackListRepository = new TrackListRepository()
  }

  public static async triggerAsyncTrackProcessing(track: Track) {
    await triggerAsyncLambda(env.processLambdaArn, track)
  }

  public static async getCurrentTrackFromCentova(): Promise<Track> {
    return await getCurrentTrackFromCentova()
  }

  public static filterOutAds(trackList: TrackList): TrackList {
    return trackList.filter((t: Track) => !isBNTrack(t))
  }

  public async processTrack(centovaTrack: Track): Promise<Track> {
    const processedTrack: Track = {
      ...centovaTrack,
      id: getTrackId(centovaTrack),
      timestamp: getTrackTs(),
      albumArt: [],
    }

    if (!isBNTrack(processedTrack)) {
      const albumArtDto = await this.albumArtRepository.getAlbumArt(processedTrack.id!!)
      if (albumArtDto === undefined) {
        processedTrack.albumArt!!.push(...(await TrackService.getAlbumArtFromSpotify(processedTrack)))
        if (processedTrack.albumArt!!.length > 0) await TrackService.triggerAsyncAlbumArtCaching(processedTrack)
      } else {
        processedTrack.albumArt!!.push(...(await TrackService.transformAlbumArtDtoToModel(albumArtDto)))
      }
    }

    await publishToSns(env.notificationTopicArn, JSON.stringify(processedTrack))
    await this.trackListRepository.putTrack(TrackService.transformTrackToDto(processedTrack))
    return processedTrack
  }

  public async getTrackList(limit: number, lastTrack?: number): Promise<{ trackList: TrackList; lastKey?: number }> {
    if (limit <= 0 || limit > 25) {
      throw Error('Limit is not between 1 and 25')
    }

    const { tracksDto, lastKey } = await this.trackListRepository.getLastTracks(limit, lastTrack)
    const trackList = await Promise.all(tracksDto.map(t => this.trackDtoToModel(t)))
    return { trackList, lastKey }
  }

  public async trackHasChanged(centovaTrack: Track): Promise<boolean> {
    const { tracksDto } = await this.trackListRepository.getLastTracks(1)
    const trackDto = tracksDto[0]
    if (trackDto === undefined) return true
    return getTrackId(centovaTrack) !== trackDto.id
  }

  public async cacheAlbumArt(spotifyAlbumArt: AlbumArt[], trackId: string) {
    if (spotifyAlbumArt.length === 0) {
      return
    }

    const results = await Promise.all(
      spotifyAlbumArt.map((sAA: AlbumArt) => TrackService.processSingleAlbumArt(trackId, sAA)),
    )
    const storedSizes: string[] = []
    results.forEach(v => {
      if (v) storedSizes.push(v)
    })

    if (storedSizes.length === 0) {
      return
    }

    await this.albumArtRepository.addAlbumArt({ id: trackId, sizes: storedSizes })
  }

  private async trackDtoToModel(dto: TrackDto): Promise<Track> {
    const track: Track = {
      id: dto.id,
      artist: dto.artist,
      name: dto.name,
      timestamp: dto.timestamp,
      albumArt: [],
    }

    if (isBNTrack(track)) {
      return track
    }

    const albumArtDto = await this.albumArtRepository.getAlbumArt(track.id!!)
    if (albumArtDto !== undefined) {
      track.albumArt = await TrackService.transformAlbumArtDtoToModel(albumArtDto)
    }

    return track
  }

  private static async getAlbumArtFromSpotify(track: Track): Promise<AlbumArt[]> {
    const results = await getSpotifyResults(track.name, track.artist)
    if (!results) {
      return []
    }
    const spotifyTrack = TrackService.findArtistInSpotifyTracks(results.tracks.items, track.artist)
    if (!spotifyTrack) {
      return []
    }
    return spotifyTrack.album.images.map(img => ({ downloadUrl: img.url, size: `${img.height}x${img.width}` }))
  }

  private static async processSingleAlbumArt(trackId: string, albumArt: AlbumArt): Promise<string | undefined> {
    const buffer = await albumArtUrlToBuffer(albumArt.downloadUrl)
    if (buffer === undefined) return undefined
    await storeAlbumArtInS3(trackId, albumArt.size, buffer)
    return albumArt.size
  }

  private static async transformAlbumArtDtoToModel(dto: AlbumArtDto): Promise<AlbumArt[]> {
    return await Promise.all(dto.sizes.map(s => getAlbumArtWithUrl(dto.id, s)))
  }

  private static transformTrackToDto(track: Track): TrackDto {
    return {
      id: track.id!!,
      radio: TrackListRepository.getPartitionKeyValue(),
      timestamp: track.timestamp!!,
      artist: track.artist,
      name: track.name,
      deleteTs: track.timestamp!! + 60 * 60 * 24 * 15, // 15 Days
    }
  }

  private static async triggerAsyncAlbumArtCaching(track: Track) {
    await triggerAsyncLambda(env.cacheLambdaArn, track)
  }

  private static findArtistInSpotifyTracks(tracks: SpotifyTrack[], artist: string): SpotifyTrack | undefined {
    const normalizedArtist = TrackService.normalizeString(artist)
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i]!!
      const { artists } = track
      for (let j = 0; j < artists.length; j += 1) {
        if (TrackService.artistsAreSimilar(TrackService.normalizeString(artists[j]!!.name), normalizedArtist)) {
          return track
        }
      }
    }

    return undefined
  }

  private static artistsAreSimilar(normalizedStr1: string, normalizedStr2: string): boolean {
    return (
      normalizedStr1 === normalizedStr2 ||
      normalizedStr1.indexOf(normalizedStr2) >= 0 ||
      normalizedStr2.indexOf(normalizedStr1) >= 0
    )
  }

  private static normalizeString(str1: string): string {
    return str1
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }
}
