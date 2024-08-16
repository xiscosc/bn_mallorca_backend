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
    'nos saluda',
  ]
  return bnNames.indexOf(track.name.toLowerCase()) > -1 || bnNames.indexOf(track.artist.toLowerCase()) > -1
}
