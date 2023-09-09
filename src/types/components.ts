import { components } from '../generated/radio.openapi'

export type Track = components['schemas']['Track']
export type AlbumArt = components['schemas']['AlbumArt']

export type AlbumArtDto = {
  id: string
  sizes: Array<string>
}

export type TrackDto = {
  id: string
  radio: string
  name: string
  artist: string
  timestamp: number
}
