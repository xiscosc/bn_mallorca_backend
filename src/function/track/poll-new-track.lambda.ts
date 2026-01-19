import type { SQSEvent } from 'aws-lambda';
import { extractErrorMessage } from '../../helpers/error.helper';
import { stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { TrackService } from '../../service/track.service';

export async function handler(event: SQSEvent): Promise<void> {
  try {
    log.info(event?.Records?.[0]?.messageId ?? 'no-valid-message-id');
    const track = await TrackService.getCurrentTrack();
    if (track === undefined || !stringIsValid(track.artist) || !stringIsValid(track.name)) {
      log.error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`);
      return;
    }

    log.info(`Track: ${JSON.stringify(track)}`);
    const trackService = new TrackService();
    const hasChanged = await trackService.trackHasChanged(track);
    log.info(`Has changed: ${hasChanged}`);
    if (hasChanged) await trackService.processTrack(track);
  } catch (err: unknown) {
    log.error(`Error processing Track: ${extractErrorMessage(err)}`);
  }
}
