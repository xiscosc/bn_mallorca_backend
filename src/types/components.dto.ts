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

export type DeviceDto = {
  token: string
  status: number
  type: string
  endopintArn: string
  subscriptionArn: string
}
