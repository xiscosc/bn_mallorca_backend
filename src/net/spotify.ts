import { SearchResults, SpotifyApi } from '@spotify/web-api-ts-sdk'
import * as log from 'lambda-log'
import { getSecretValue } from './secrets-manager'
import { env } from '../config/env'

let spotifySecret: string | undefined
let spotifyClientId: string | undefined

export async function getSpotifyResults(name: string, artist: string): Promise<SearchResults | undefined> {
  try {
    await loadSpotifySecrets()
    const sdk = SpotifyApi.withClientCredentials(spotifyClientId!!, spotifySecret!!)
    const query = `track:${name.replace(' ', '-')} artist:${artist.replace(' ', '-')}`
    return await sdk.search(query, ['track'], 'ES', 20)
  } catch (err: any) {
    log.error(`Error downloading from spotify: ${err.toString()} - ${name} / ${artist}`)
    return undefined
  }
}

async function loadSpotifySecrets() {
  if (spotifyClientId === undefined) {
    spotifyClientId = await getSecretValue(env.spotifyClientIdArn)
  }

  if (spotifySecret === undefined) {
    spotifySecret = await getSecretValue(env.spotifySecretIdArn)
  }

  if (spotifySecret === undefined || spotifyClientId === undefined) {
    throw new Error('Could not load spotify secrets')
  }
}
