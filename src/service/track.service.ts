import { AlbumArtService } from './album-art.service'
import { env } from '../config/env'
import { getTrackId, getTrackTs, isBNTrack } from '../helpers/track.helper'
import { getCurrentTrackFromCentova } from '../net/centova.downloader'
import { publishToSns } from '../net/sns'
import { TrackListRepository } from '../repository/track-list.repository'
import { Track, TrackList } from '../types/components'
import { TrackDto } from '../types/components.dto'

export class TrackService {
  private trackListRepository: TrackListRepository
  private albumArtService: AlbumArtService

  constructor() {
    this.trackListRepository = new TrackListRepository()
    this.albumArtService = new AlbumArtService()
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

    processedTrack.albumArt = await this.albumArtService.getAlbumArt(processedTrack)
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

  private async trackDtoToModel(dto: TrackDto): Promise<Track> {
    const track: Track = {
      id: dto.id,
      artist: dto.artist,
      name: dto.name,
      timestamp: dto.timestamp,
      albumArt: [],
    }

    track.albumArt = await this.albumArtService.getAlbumArt(track, true)
    return track
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
}
