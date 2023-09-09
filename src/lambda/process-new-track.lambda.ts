import * as log from 'lambda-log'
import { stringIsValid } from '../helpers/lambda.helper'
import { TrackService } from '../service/track.service'
import { Track } from '../types/components'

export async function handler(track?: Track): Promise<any> {
  if (track === undefined || !stringIsValid(track.artist) || !stringIsValid(track.name)) {
    log.error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`)
    throw new Error(`Process track: Artist or name are invalid - ${JSON.stringify(track)}`)
  }

  try {
    const trackService = new TrackService()
    await trackService.processTrack(track)
  } catch (err: any) {
    log.error(`Error processing Track: ${err.toString()} - ${JSON.stringify(track)}`)
    throw new Error(`Error processing Track: ${err.toString()} - ${JSON.stringify(track)}`)
  }
}
