import { env } from '../config/env';
import type { Track } from '../types/components';

type CentovaResponse = {
  data: Array<Array<{ artist: string; title: string }>>;
};

export async function getCurrentTrackFromCentova(): Promise<Track> {
  const response = await fetch(env.centovaUrl);
  const data = (await response.json()) as CentovaResponse;
  const centovaTrack = data.data[0]?.[0];
  if (!centovaTrack) {
    throw new Error('No track data available from Centova');
  }
  return { artist: centovaTrack.artist, name: centovaTrack.title };
}
