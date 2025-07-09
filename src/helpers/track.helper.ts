import { Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'

import crypto from 'crypto'
import { getTs } from './time.helper'
import { Track } from '../types/components'

export function getTrackId(track: Track): string {
  return crypto.createHash('sha1').update(`${track.name}++${track.artist}`).digest('hex')
}

export function getTrackTs(): number {
  return getTs()
}

export function isBNTrack(track: Track): boolean {
  const bnNames = [
    'bn mallorca',
    'bn mallorca radio',
    'publicidad',
    'bn mca',
    'bn mca radio',
    'en bn mca radio',
    'unknown',
    'not defined',
    'nos saluda',
    'nos saludan',
  ]
  return bnNames.indexOf(track.name.toLowerCase()) > -1 || bnNames.indexOf(track.artist.toLowerCase()) > -1
}

export function isUnknownTrack(track: Track): boolean {
  const unknownNames = ['unknown', 'not defined']
  return unknownNames.indexOf(track.name.toLowerCase()) > -1 || unknownNames.indexOf(track.artist.toLowerCase()) > -1
}

export function cleanUnknownTrack(track: Track): Track {
  if (!isUnknownTrack(track)) {
    return track
  }

  return { ...track, name: 'BN MCA', artist: 'Radio' }
}

export function findArtistInSpotifyTracks(tracks: SpotifyTrack[], artist: string): SpotifyTrack | undefined {
  const normalizedArtist = normalizeString(artist)
  for (let i = 0; i < tracks.length; i += 1) {
    const track = tracks[i]!!
    const { artists } = track
    for (let j = 0; j < artists.length; j += 1) {
      if (artistsAreSimilar(normalizeString(artists[j]!!.name), normalizedArtist)) {
        return track
      }
    }
  }

  return undefined
}

export function artistsAreSimilar(normalizedStr1: string, normalizedStr2: string): boolean {
  return (
    normalizedStr1 === normalizedStr2 ||
    normalizedStr1.indexOf(normalizedStr2) >= 0 ||
    normalizedStr2.indexOf(normalizedStr1) >= 0
  )
}

export function normalizeString(str1: string): string {
  return str1
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
