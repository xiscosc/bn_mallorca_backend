import * as log from 'lambda-log'
import { stringIsValid } from '../../../helpers/lambda.helper'
import { TrackService } from '../../../service/track.service'
import { Track } from '../../../types/components'

export async function handler(track?: Track): Promise<any> {
  if (track === undefined || !stringIsValid(track.id) || track.albumArt === undefined || track.albumArt.length === 0) {
    log.error(`Cache album art: invalid track - ${JSON.stringify(track)}`)
    throw Error(`Cache album art: invalid track - ${JSON.stringify(track)}`)
  }

  try {
    const trackService = new TrackService()
    await trackService.cacheAlbumArt(track.albumArt, track.id!!)
  } catch (err: any) {
    log.error(`Error caching track album art: ${err.toString()} - ${JSON.stringify(track)}`)
    throw Error(`Error caching track album art: ${err.toString()} - ${JSON.stringify(track)}`)
  }
}
