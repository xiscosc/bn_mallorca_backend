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
        icyCharacterEncoding: 'iso-8859-1',
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

function sanitizeString(str: string): string {
  return (
    str
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally matching control characters to remove them
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Replace common curly quotes/apostrophes with straight versions
      .replace(/[''‚]/g, "'")
      .replace(/[""„]/g, '"')
      // Remove Unicode replacement character
      .replace(/\uFFFD/g, '')
      // Normalize multiple spaces to single space
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function parseMetadata(streamTitle?: string): Track | undefined {
  if (!streamTitle) {
    return undefined;
  }

  const sanitizedTitle = sanitizeString(streamTitle);
  const separators = [' - ', ' – ', ' — ', ' | '];
  const separator = separators.find((sep) => sanitizedTitle.includes(sep));

  if (!separator) return undefined;

  const parts = sanitizedTitle.split(separator);
  const artist = parts[0]?.trim() ?? '';
  let nameParts = parts.slice(1);

  // Dedupe if artist is repeated at the start of the name
  if (nameParts[0]?.trim() === artist) {
    nameParts = nameParts.slice(1);
  }

  const name = nameParts.join(separator).trim();
  return artist && name ? { artist, name } : undefined;
}
