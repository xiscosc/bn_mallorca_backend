import * as log from 'lambda-log';
import { env } from '../config/env';
import {
  cleanUnknownTrack,
  getTrackId,
  getTrackTs,
  isBNTrack,
  isUnknownTrackForPlayer,
  isUnknownTrackForTrackList,
} from '../helpers/track.helper';
import { getCurrentTrackFromCentova } from '../net/centova.downloader';
import { getTrackFromMetadataStream } from '../net/metadata';
import { publishToSns } from '../net/sns';
import { TrackListRepository } from '../repository/track-list.repository';
import type { Track, TrackList } from '../types/components';
import type { TrackDto } from '../types/components.dto';
import { TrackSource } from '../types/track-source.enum';
import { AlbumArtService } from './album-art.service';

export class TrackService {
  private trackListRepository: TrackListRepository;
  private albumArtService: AlbumArtService;

  constructor() {
    this.trackListRepository = new TrackListRepository();
    this.albumArtService = new AlbumArtService();
  }

  public static async getCurrentTrack(): Promise<Track | undefined> {
    log.info(`Getting current track from ${env.trackSource}`);
    switch (env.trackSource) {
      case TrackSource.CENTOVA:
        return await getCurrentTrackFromCentova();
      case TrackSource.CENTOVA_METADATA:
        return await TrackService.getTrackFromMetadataStream(env.centovaStreamUrl);
      default:
        return undefined;
    }
  }

  public static filterOutAds(trackList: TrackList): TrackList {
    return trackList.filter((t: Track) => !isBNTrack(t));
  }

  public async processTrack(centovaTrack: Track): Promise<Track> {
    const processedTrack: Track = {
      ...centovaTrack,
      id: getTrackId(centovaTrack),
      timestamp: getTrackTs(),
      albumArt: [],
    };

    processedTrack.albumArt = await this.albumArtService.getAlbumArt(processedTrack);
    await publishToSns(env.notificationTopicArn, JSON.stringify(cleanUnknownTrack(processedTrack)));
    await this.trackListRepository.putTrack(TrackService.transformTrackToDto(processedTrack));
    return processedTrack;
  }

  public async getTrackList(
    limit: number,
    filterOutAds: boolean,
    lastTrack?: number,
  ): Promise<{ trackList: TrackList; lastKey?: number }> {
    if (limit <= 0 || limit > 25) {
      throw Error('Limit is not between 1 and 25');
    }

    const { tracksDto, lastKey } = await this.trackListRepository.getLastTracks(limit, lastTrack);
    const trackList = await Promise.all(tracksDto.map((t) => this.trackDtoToModel(t)));
    const checkUnknown = filterOutAds ? isUnknownTrackForTrackList : isUnknownTrackForPlayer;

    const filteredTrackList: TrackList = [];
    trackList.forEach((track) => {
      if (checkUnknown(track)) {
        filteredTrackList.push(cleanUnknownTrack(track));
      } else if (!filterOutAds) {
        filteredTrackList.push(track);
      } else if (!isBNTrack(track)) {
        filteredTrackList.push(track);
      }
    });

    return { trackList: filteredTrackList, lastKey };
  }

  public async trackHasChanged(centovaTrack: Track): Promise<boolean> {
    const { tracksDto } = await this.trackListRepository.getLastTracks(1);
    const trackDto = tracksDto[0];
    if (trackDto === undefined) return true;
    return getTrackId(centovaTrack) !== trackDto.id;
  }

  private async trackDtoToModel(dto: TrackDto): Promise<Track> {
    const track: Track = {
      id: dto.id,
      artist: dto.artist,
      name: dto.name,
      timestamp: dto.timestamp,
      albumArt: [],
    };

    track.albumArt = await this.albumArtService.getAlbumArt(track, true);
    return track;
  }

  private static transformTrackToDto(track: Track): TrackDto {
    if (track.id == null || track.timestamp == null) {
      throw Error('Track id or timestamp is null');
    }

    return {
      id: track.id,
      radio: TrackListRepository.getPartitionKeyValue(),
      timestamp: track.timestamp,
      artist: track.artist,
      name: track.name,
      deleteTs: track.timestamp + 60 * 60 * 24 * 15, // 15 Days
    };
  }

  private static async getTrackFromMetadataStream(streamUrl?: string): Promise<Track | undefined> {
    const metadataTrack = await getTrackFromMetadataStream(streamUrl);
    if (metadataTrack) {
      return metadataTrack;
    }

    log.warn('No track found in metadata stream, getting track from Centova');
    return getCurrentTrackFromCentova();
  }
}
