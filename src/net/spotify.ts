import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import * as log from 'lambda-log'
import { getSecretValue } from './secrets-manager'
import { env } from '../config/env'
import { AlbumArt, Track } from '../types/components'

let spotifySecret: string | undefined
let spotifyClientId: string | undefined
export async function getAlbumArtFromSpotify(track: Track): Promise<AlbumArt[]> {
  try {
    await loadSpotifySecrets()
    const sdk = SpotifyApi.withClientCredentials(spotifyClientId!!, spotifySecret!!)
    const items = await sdk.search(`${track.name} ${track.artist}`, ['track'])
    if (items.tracks.items.length === 0) return []
    const spotifyTrack = items.tracks.items[0]!!
    return spotifyTrack.album.images.map(img => ({ downloadUrl: img.url, size: `${img.height}x${img.width}` }))
  } catch (err: any) {
    log.error(`Error downloading from spotify: ${err.toString()} - ${JSON.stringify(track)}`)
  }

  return []
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
