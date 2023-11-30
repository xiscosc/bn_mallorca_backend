import { SQSEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { TrackService } from '../service/track.service'

export async function handler(event: SQSEvent): Promise<any> {
  try {
    log.info(event?.Records[0]?.messageId ?? '')
    const trackService = new TrackService()
    const track = await TrackService.getCurrentTrackFromCentova()
    const hasChanged = await trackService.trackHasChanged(track)
    if (hasChanged) {
      await TrackService.triggerAsyncTrackProcessing(track)
    }
  } catch (err: any) {
    log.error(`Error processing Track: ${err.toString()}`)
  }
}
