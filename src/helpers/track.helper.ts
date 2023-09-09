import crypto from 'crypto'
import { Track } from '../types/components'

export function getTrackId(track: Track): string {
  return crypto.createHash('sha1').update(`${track.name}++${track.artist}`).digest('hex')
}

export function getTrackTs(): number {
  return Math.floor(Date.now() / 1000)
}

export function isBNTrack(track: Track): boolean {
  const bnNames = ['bn mallorca', 'publicidad', 'bn mca']
  return bnNames.indexOf(track.name.toLowerCase()) > -1 || bnNames.indexOf(track.artist.toLowerCase()) > -1
}
