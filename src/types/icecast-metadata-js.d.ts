declare module 'icecast-metadata-js' {
  export interface IcecastMetadata {
    StreamTitle?: string;
    StreamUrl?: string;
    [key: string]: string | undefined;
  }

  export class IcecastMetadataReader {
    constructor();
    
    onMetadata: ((metadata: IcecastMetadata) => void) | null;
    onStream: ((stream: ReadableStream<Uint8Array>) => void) | null;
    onError: ((error: Error) => void) | null;
    
    readData(data: Uint8Array): void;
  }
}
