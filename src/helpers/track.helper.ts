import { Track as SpotifyTrack } from '@spotify/web-api-ts-sdk'

import crypto from 'crypto'
import { getTs } from './time.helper'
import { Track } from '../types/components'

const unknownNames = ['unknown']
const unknownPlayerNames = ['not defined']
const bnNames = [
  'bn mallorca',
  'bn mallorca radio',
  'publicidad',
  'servicios',
  'bn mca',
  'bn mca radio',
  'en bn mca radio',
  'nos saluda',
  'nos saludan',
]

export function getTrackId(track: Track): string {
  return crypto.createHash('sha1').update(`${track.name}++${track.artist}`).digest('hex')
}

export function getTrackTs(): number {
  return getTs()
}

export function isBNTrack(track: Track): boolean {
  return isTrackWithinList(track, bnNames)
}

export function isUnknownTrackForPlayer(track: Track): boolean {
  return isTrackWithinList(track, [...unknownNames, ...unknownPlayerNames])
}

export function isUnknownTrackForTrackList(track: Track): boolean {
  return isTrackWithinList(track, unknownNames)
}

export function cleanUnknownTrack(track: Track): Track {
  if (isUnknownTrackForPlayer(track) || isUnknownTrackForTrackList(track)) {
    return { ...track, name: 'BN MCA', artist: 'Radio' }
  }

  return track
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

function isTrackWithinList(track: Track, list: string[]): boolean {
  return list.indexOf(track.name.toLowerCase()) > -1 || list.indexOf(track.artist.toLowerCase()) > -1
}
