import * as log from 'lambda-log';

export async function albumArtUrlToBuffer(url: string): Promise<Buffer | undefined> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error downloading image: ${errorMessage} - ${url}`);
    return undefined;
  }
}
