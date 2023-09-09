import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { badRequest, internalServerError, ok } from '../helpers/lambda.helper'
import { TrackService } from '../service/track.service'
import { TrackList, TrackListResponse } from '../types/components'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const queryLimitStr = event.queryStringParameters?.['limit']
  const limit = queryLimitStr ? parseInt(queryLimitStr, 10) : 1
  if (limit < 1 || limit > 25) {
    return badRequest({ message: 'Limit has to be between 1 and 25' })
  }

  try {
    const trackService = new TrackService()
    const trackList: TrackList = await trackService.getTrackList(limit)
    const response: TrackListResponse = { count: trackList.length, tracks: trackList }
    return ok(response)
  } catch (err: any) {
    log.error(`Error getting track list: ${err.toString()}`)
    return internalServerError({ message: 'Error obtaining the track list' })
  }
}
