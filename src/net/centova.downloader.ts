import axios from 'axios'
import { env } from '../config/env'
import { Track } from '../types/components'

export async function getCurrentTrackFromCentova(): Promise<Track> {
  const response = await axios.get(env.centovaUrl)
  const centovaTrack = response.data.data[0]
  return { artist: centovaTrack.artist, name: centovaTrack.title }
}
