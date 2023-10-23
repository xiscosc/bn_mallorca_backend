import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { badRequest, internalServerError, created, stringIsValid } from '../helpers/lambda.helper'
import { TrackService } from '../service/track.service'
import { Track } from '../types/components'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  if (!stringIsValid(event.body)) {
    return badRequest({ message: 'Body can not be empty' })
  }

  const track: Track = JSON.parse(event.body!!)
  if (!stringIsValid(track.artist) || !stringIsValid(track.name)) {
    return badRequest({ message: 'Track info is not valid' })
  }

  try {
    await TrackService.triggerAsyncTrackProcessing(track)
    return created({ message: 'Track recorded for processing' })
  } catch (err: any) {
    log.error(`Error processing Track: ${err.toString()} - ${JSON.stringify(track)}`)
    return internalServerError({ message: 'Error processing track' })
  }
}
