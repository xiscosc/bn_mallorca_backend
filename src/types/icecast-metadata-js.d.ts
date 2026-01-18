declare module 'icecast-metadata-js' {
  export interface IcecastMetadata {
    StreamTitle?: string;
    StreamUrl?: string;
    TITLE?: string;
    [key: string]: string | undefined;
  }

  export interface IcecastMetadataValue {
    metadata: IcecastMetadata;
  }

  export interface IcecastReadableStreamOptions {
    metadataTypes?: Array<'icy' | 'ogg'>;
    onMetadata?: (value: IcecastMetadataValue) => void;
  }

  export class IcecastReadableStream {
    constructor(response: Response, options?: IcecastReadableStreamOptions);
    startReading(): Promise<void>;
  }
}
