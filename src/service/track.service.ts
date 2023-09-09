import { env } from '../config/env'
import { albumArtUrlToBuffer } from '../helpers/album-art.helper'
import { getTrackId, getTrackTs, isBNTrack } from '../helpers/track.helper'
import { triggerAsyncLambda } from '../net/lambda'
import { getAlbumArtWithSignedUrl, storeAlbumArtInS3 } from '../net/s3'
import { publishToSns } from '../net/sns'
import { getAlbumArtFromSpotify } from '../net/spotify'
import { AlbumArtRepository } from '../repository/album-art.repository'
import { TrackListRepository } from '../repository/track-list.repository'
import { AlbumArt, AlbumArtDto, Track, TrackDto } from '../types/components'

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
        processedTrack.albumArt!!.push(...(await getAlbumArtFromSpotify(processedTrack)))
        if (processedTrack.albumArt!!.length > 0) await TrackService.triggerAsyncAlbumArtCaching(processedTrack)
      } else {
        processedTrack.albumArt!!.push(...(await TrackService.transformAlbumArtDtoToModel(albumArtDto)))
      }
    }

    await publishToSns(env.notificationTopicArn, JSON.stringify(processedTrack))
    await this.trackListRepository.putTrack(TrackService.transformTrackToDto(processedTrack))
    return processedTrack
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

  private static async processSingleAlbumArt(trackId: string, albumArt: AlbumArt): Promise<string | undefined> {
    const buffer = await albumArtUrlToBuffer(albumArt.downloadUrl)
    if (buffer === undefined) return undefined
    await storeAlbumArtInS3(trackId, albumArt.size, buffer)
    return albumArt.size
  }

  private static async transformAlbumArtDtoToModel(dto: AlbumArtDto): Promise<AlbumArt[]> {
    return await Promise.all(dto.sizes.map(s => getAlbumArtWithSignedUrl(dto.id, s)))
  }

  private static transformTrackToDto(track: Track): TrackDto {
    return {
      id: track.id!!,
      radio: 'BNMALLORCA',
      timestamp: track.timestamp!!,
      artist: track.artist,
      name: track.name,
    }
  }

  private static async triggerAsyncAlbumArtCaching(track: Track) {
    await triggerAsyncLambda(env.cacheLambdaArn, track)
  }
}
