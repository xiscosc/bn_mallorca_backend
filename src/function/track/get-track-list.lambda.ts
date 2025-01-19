import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { badRequest, internalServerError, ok } from '../../helpers/lambda.helper'
import { TrackService } from '../../service/track.service'
import { TrackListResponse } from '../../types/components'

const trackService = new TrackService()
export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const queryLimitStr = event.queryStringParameters?.['limit']
  const lastTrack = event.queryStringParameters?.['lastTrack']
  const filterAds = event.queryStringParameters?.['filterAds'] != null
  const limit = queryLimitStr ? parseInt(queryLimitStr, 10) : 1
  if (limit < 1 || limit > 25) {
    return badRequest({ message: 'Limit has to be between 1 and 25' })
  }

  try {
    const { trackList, lastKey } = await trackService.getTrackList(limit, parseLastTrackValue(lastTrack))
    const tracks = filterAds ? TrackService.filterOutAds(trackList) : trackList
    const response: TrackListResponse = { count: trackList.length, tracks }
    if (lastKey != null) {
      response.lastTrack = lastKey
    }
    return ok(response)
  } catch (err: any) {
    log.error(`Error getting track list: ${err.toString()}`)
    return internalServerError({ message: 'Error obtaining the track list' })
  }
}

function parseLastTrackValue(v?: string): number | undefined {
  if (v == null) {
    return undefined
  }

  const parsedValue = parseInt(v, 10)
  if (Number.isNaN(parsedValue)) {
    return undefined
  }

  return parsedValue
}
