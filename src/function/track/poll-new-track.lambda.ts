import type { SQSEvent } from 'aws-lambda';
import * as log from 'lambda-log';
import { stringIsValid } from '../../helpers/lambda.helper';
import { TrackService } from '../../service/track.service';

export async function handler(event: SQSEvent): Promise<void> {
  try {
    log.info(event?.Records[0]?.messageId ?? '');
    const track = await TrackService.getCurrentTrack();
    if (track === undefined || !stringIsValid(track.artist) || !stringIsValid(track.name)) {
      log.error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`);
      return;
    }

    const trackService = new TrackService();
    const hasChanged = await trackService.trackHasChanged(track);
    if (hasChanged) await trackService.processTrack(track);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error processing Track: ${errorMessage}`);
  }
}
