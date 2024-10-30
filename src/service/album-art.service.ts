import { env } from '../config/env'
import { findArtistInSpotifyTracks, isBNTrack } from '../helpers/track.helper'
import { albumArtUrlToBuffer } from '../net/album-art.downloader'
import { triggerAsyncLambda } from '../net/lambda'
import { getAlbumArtWithUrl, storeAlbumArtInS3 } from '../net/s3'
import { getSpotifyResults } from '../net/spotify'
import { AlbumArtRepository } from '../repository/album-art.repository'
import { AlbumArt, Track } from '../types/components'
import { AlbumArtDto } from '../types/components.dto'

export interface IAlbumCacheRequest {
  trackId: string
  albumArt: AlbumArt[]
}

export class AlbumArtService {
  private albumArtRepository: AlbumArtRepository

  constructor() {
    this.albumArtRepository = new AlbumArtRepository()
  }

  public async getAlbumArt(track: Track, onlyCache: boolean = false): Promise<AlbumArt[]> {
    if (isBNTrack(track)) {
      return []
    }

    const cachedAlbumArt = await this.getAlbumArtFromCache(track.id!)
    if (cachedAlbumArt) {
      return cachedAlbumArt
    }

    if (onlyCache) {
      return []
    }

    const spotifyAlbumArt = await AlbumArtService.getAlbumArtFromSpotify(track)
    if (spotifyAlbumArt.length > 0) {
      const cacheRequest: IAlbumCacheRequest = { trackId: track.id!, albumArt: spotifyAlbumArt }
      await triggerAsyncLambda(env.cacheLambdaArn, cacheRequest)
      return spotifyAlbumArt
    }

    return []
  }

  public async cacheAlbumArt({ trackId, albumArt }: IAlbumCacheRequest) {
    if (albumArt.length === 0) {
      return
    }

    const results = await Promise.all(
      albumArt.map((sAA: AlbumArt) => AlbumArtService.processSingleAlbumArt(trackId, sAA)),
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

  private async getAlbumArtFromCache(trackId: string): Promise<AlbumArt[] | null> {
    const dto = await this.albumArtRepository.getAlbumArt(trackId)
    return dto ? await AlbumArtService.transformAlbumArtDtoToModel(dto) : null
  }

  private static async getAlbumArtFromSpotify(track: Track): Promise<AlbumArt[]> {
    const results = await getSpotifyResults(track.name, track.artist)
    if (!results) {
      return []
    }
    const spotifyTrack = findArtistInSpotifyTracks(results.tracks.items, track.artist)
    if (!spotifyTrack) {
      return []
    }
    return spotifyTrack.album.images.map(img => ({ downloadUrl: img.url, size: `${img.height}x${img.width}` }))
  }

  private static async transformAlbumArtDtoToModel(dto: AlbumArtDto): Promise<AlbumArt[]> {
    return await Promise.all(dto.sizes.map(s => getAlbumArtWithUrl(dto.id, s)))
  }

  private static async processSingleAlbumArt(trackId: string, albumArt: AlbumArt): Promise<string | undefined> {
    const buffer = await albumArtUrlToBuffer(albumArt.downloadUrl)
    if (buffer === undefined) return undefined
    await storeAlbumArtInS3(trackId, albumArt.size, buffer)
    return albumArt.size
  }
}
