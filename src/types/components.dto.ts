export type TrackDto = {
  id: string;
  radio: string;
  name: string;
  artist: string;
  timestamp: number;
  deleteTs: number;
};

export type AlbumArtDto = {
  id: string;
  sizes: Array<string>;
};

export type DeviceDto = {
  token: string;
  status: number;
  type: string;
  endpointArn: string;
  subscriptionArn: string;
  subscribedAt: number;
};

export type ShowDto = {
  id: string;
  numberOfTheWeek: number;
  hour: number;
  minute: number;
  name: string;
  artist: string;
  online: boolean;
  podcastUrl: string;
  thumbnailUrl?: string;
};
