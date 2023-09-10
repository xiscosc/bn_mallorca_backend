import { SearchResults, SpotifyApi, Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'
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
    const query = `track:${track.name.replace(' ', '-')} artist:${track.artist.replace(' ', '-')}`
    const items = await sdk.search(query, ['track'], 'ES', 20)
    const spotifyTrack = findArtistTrack(items, track.artist)
    if (spotifyTrack) {
      return spotifyTrack.album.images.map(img => ({ downloadUrl: img.url, size: `${img.height}x${img.width}` }))
    }
  } catch (err: any) {
    log.error(`Error downloading from spotify: ${err.toString()} - ${JSON.stringify(track)}`)
  }

  return []
}

function findArtistTrack(items: SearchResults, artist: string): SpotifyTrack | undefined {
  for (let i = 0; i < items.tracks.items.length; i += 1) {
    const track = items.tracks.items[i]!!
    const { artists } = track
    for (let j = 0; j < artists.length; j += 1) {
      if (areStringsSimilar(artists[j]!!.name, artist)) {
        return track
      }
    }
  }

  return undefined
}

function areStringsSimilar(str1: string, str2: string): boolean {
  // Normalize both strings to remove accent marks and ensure consistent casing
  const normalizedStr1 = str1
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const normalizedStr2 = str2
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  // Compare the normalized strings for similarity
  return normalizedStr1 === normalizedStr2
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
