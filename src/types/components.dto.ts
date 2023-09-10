export type TrackDto = {
  id: string
  radio: string
  name: string
  artist: string
  timestamp: number
  deleteTs: number
}

export type AlbumArtDto = {
  id: string
  sizes: Array<string>
}
