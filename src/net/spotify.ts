import { type PartialSearchResult, SpotifyApi } from '@spotify/web-api-ts-sdk';
import { env } from '../config/env';
import { extractErrorMessage } from '../helpers/error.helper';
import { log } from '../helpers/logger';
import { getSecretValue } from './secrets-manager';

let spotifySecret: string | undefined;
let spotifyClientId: string | undefined;

export async function getSpotifyResults(
  name: string,
  artist: string,
): Promise<Required<Pick<PartialSearchResult, 'tracks'>> | undefined> {
  try {
    await loadSpotifySecrets();
    const sdk = SpotifyApi.withClientCredentials(spotifyClientId!, spotifySecret!);
    const query = `track:${name.replace(' ', '-')} artist:${artist.replace(' ', '-')}`;
    return await sdk.search(query, ['track'], 'ES', 20);
  } catch (err: unknown) {
    log.error(`Error downloading from spotify: ${extractErrorMessage(err)} - ${name} / ${artist}`);
    return undefined;
  }
}

async function loadSpotifySecrets() {
  if (spotifyClientId === undefined) {
    spotifyClientId = await getSecretValue(env.spotifyClientIdArn);
  }

  if (spotifySecret === undefined) {
    spotifySecret = await getSecretValue(env.spotifySecretIdArn);
  }

  if (spotifySecret === undefined || spotifyClientId === undefined) {
    throw new Error('Could not load spotify secrets');
  }
}
