import type { SQSEvent } from 'aws-lambda';
import { extractErrorMessage } from '../../helpers/error.helper';
import { stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { TrackService } from '../../service/track.service';

export async function handler(_event: SQSEvent): Promise<void> {
  try {
    const track = await TrackService.getCurrentTrack();
    if (track === undefined || !stringIsValid(track.artist) || !stringIsValid(track.name)) {
      log.error({ track }, 'Invalid track');
      return;
    }

    const trackService = new TrackService();
    const hasChanged = await trackService.trackHasChanged(track);
    if (hasChanged) {
      await trackService.processTrack(track);
      log.info({ trackId: track.id, track: track.name, artist: track.artist }, 'Processed track');
    } else {
      log.info(
        { trackId: track.id, track: track.name, artist: track.artist },
        'Track has not changed',
      );
    }
  } catch (err: unknown) {
    log.error({ error: extractErrorMessage(err) }, 'Error polling track');
    throw err;
  }
}
