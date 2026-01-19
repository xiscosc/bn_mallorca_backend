import type { APIGatewayEvent, ProxyResult } from 'aws-lambda';
import { extractErrorMessage } from '../../helpers/error.helper';
import { badRequest, internalServerError, ok } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { TrackService } from '../../service/track.service';
import type { TrackListResponse } from '../../types/components';

const trackService = new TrackService();
export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const queryLimitStr = event.queryStringParameters?.['limit'];
  const lastTrack = event.queryStringParameters?.['lastTrack'];
  const filterAds = event.queryStringParameters?.['filterAds'] != null;
  const limit = queryLimitStr ? parseInt(queryLimitStr, 10) : 1;
  if (limit < 1 || limit > 25) {
    return badRequest({ message: 'Limit has to be between 1 and 25' });
  }

  try {
    const { trackList, lastKey } = await trackService.getTrackList(
      limit,
      filterAds,
      parseLastTrackValue(lastTrack),
    );
    const response: TrackListResponse = { count: trackList.length, tracks: trackList };
    if (lastKey != null) {
      response.lastTrack = lastKey;
    }
    return ok(response);
  } catch (err: unknown) {
    log.error(`Error getting track list: ${extractErrorMessage(err)}`);
    return internalServerError({ message: 'Error obtaining the track list' });
  }
}

function parseLastTrackValue(v?: string): number | undefined {
  if (v == null) {
    return undefined;
  }

  const parsedValue = parseInt(v, 10);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}
