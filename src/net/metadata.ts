import { IcecastReadableStream } from 'icecast-metadata-js';
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
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return new Promise<Track | undefined>((resolve) => {
      const icecast = new IcecastReadableStream(response, {
        metadataTypes: ['icy'],
        onMetadata: ({ metadata }) => {
          clearTimeout(timeoutId);
          controller.abort();
          resolve(parseMetadata(metadata.StreamTitle));
        },
      });

      icecast.startReading().catch(() => resolve(undefined));
    });
  } catch {
    clearTimeout(timeoutId);
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
