import { IcecastMetadataReader } from 'icecast-metadata-js';
import * as log from 'lambda-log';
import type { Track } from '../types/components';

export async function getTrackFromMetadataStream(streamUrl?: string): Promise<Track | undefined> {
  if (!streamUrl) {
    log.warn('Stream URL is not set');
    return undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(streamUrl, {
      headers: {
        'Icy-MetaData': '1',
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read stream');
    }

    const metadataReader = new IcecastMetadataReader();

    return new Promise<Track | undefined>((resolve, reject) => {
      let metadataReceived = false;

      metadataReader.onMetadata = (metadata) => {
        metadataReceived = true;
        clearTimeout(timeoutId);
        reader.cancel();

        const track = parseMetadata(metadata.StreamTitle);
        resolve(track);
      };

      metadataReader.onStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              if (!metadataReceived) {
                reject(new Error('Stream ended before metadata'));
              }
              break;
            }

            metadataReader.readData(value);
          }
        } catch (error) {
          if (!metadataReceived) {
            reject(error);
          }
        }
      };

      metadataReader.onError = (error) => {
        clearTimeout(timeoutId);
        reader.cancel();
        reject(error);
      };

      // Start reading
      metadataReader.onStream(new ReadableStream());
    });
  } catch (error) {
    clearTimeout(timeoutId);
    log.error(`Error getting track from metadata ${JSON.stringify(error)}`);
    return undefined;
  }
}

function parseMetadata(streamTitle?: string): Track | undefined {
  if (!streamTitle) {
    return undefined;
  }

  const result: Track = {
    name: '',
    artist: '',
  };

  const separators = [' - ', ' – ', ' — ', ' | '];
  const separator = separators.find((sep) => streamTitle.includes(sep));

  if (separator) {
    const parts = streamTitle.split(separator);
    result.artist = parts[0]?.trim() ?? '';
    result.name = parts.slice(1).join(separator).trim();
  } else {
    result.name = streamTitle;
  }

  return result.artist && result.name ? result : undefined;
}
