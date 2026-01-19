import { extractErrorMessage } from '../helpers/error.helper';
import { log } from '../helpers/logger';

export async function albumArtUrlToBuffer(url: string): Promise<Buffer | undefined> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    log.error(`Error downloading image: ${extractErrorMessage(err)} - ${url}`);
    return undefined;
  }
}
