import * as log from 'lambda-log'
import { stringIsValid } from '../../../helpers/lambda.helper'
import { AlbumArtService, IAlbumCacheRequest } from '../../../service/album-art.service'

export async function handler({ trackId, albumArt }: IAlbumCacheRequest): Promise<any> {
  if (!stringIsValid(trackId) || albumArt == null || albumArt.length === 0) {
    log.error(`Cache album art: invalid track - ${JSON.stringify(trackId)}`)
    throw Error(`Cache album art: invalid track - ${JSON.stringify(trackId)}`)
  }

  try {
    const albumArtService = new AlbumArtService()
    await albumArtService.cacheAlbumArt({ trackId, albumArt })
  } catch (err: any) {
    log.error(`Error caching track album art: ${err.toString()} - ${JSON.stringify(trackId)}`)
    throw Error(`Error caching track album art: ${err.toString()} - ${JSON.stringify(trackId)}`)
  }
}
