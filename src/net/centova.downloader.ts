import { env } from '../config/env';
import { log } from '../helpers/logger';
import type { Track } from '../types/components';

type CentovaResponse = {
  data: Array<Array<{ artist: string; title: string }>>;
};

export async function getCurrentTrackFromCentova(): Promise<Track | undefined> {
  const response = await fetch(env.centovaUrl);
  const data = (await response.json()) as CentovaResponse;
  const centovaTrack = data.data[0]?.[0];
  if (!centovaTrack) {
    log.warn('No track data available from Centova');
    return undefined;
  }
  return { artist: centovaTrack.artist, name: centovaTrack.title };
}
