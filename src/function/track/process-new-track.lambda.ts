import { extractErrorMessage } from '../../helpers/error.helper';
import { stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { TrackService } from '../../service/track.service';
import type { Track } from '../../types/components';

// For testing purposes
const trackService = new TrackService();
export async function handler(track?: Track): Promise<void> {
  if (track === undefined || !stringIsValid(track.artist) || !stringIsValid(track.name)) {
    log.error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`);
    throw new Error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`);
  }

  try {
    await trackService.processTrack(track);
  } catch (err: unknown) {
    const errorMessage = extractErrorMessage(err);
    log.error(`Error processing Track: ${errorMessage} - ${JSON.stringify(track)}`);
    throw new Error(`Error processing Track: ${errorMessage} - ${JSON.stringify(track)}`);
  }
}
