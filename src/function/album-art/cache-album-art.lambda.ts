import * as log from 'lambda-log';
import { stringIsValid } from '../../helpers/lambda.helper';
import { AlbumArtService, type IAlbumCacheRequest } from '../../service/album-art.service';

export async function handler({ trackId, albumArt }: IAlbumCacheRequest): Promise<void> {
  if (!stringIsValid(trackId) || albumArt == null || albumArt.length === 0) {
    log.error(`Cache album art: invalid track - ${JSON.stringify(trackId)}`);
    throw Error(`Cache album art: invalid track - ${JSON.stringify(trackId)}`);
  }

  try {
    const albumArtService = new AlbumArtService();
    await albumArtService.cacheAlbumArt({ trackId, albumArt });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error caching track album art: ${errorMessage} - ${JSON.stringify(trackId)}`);
    throw Error(`Error caching track album art: ${errorMessage} - ${JSON.stringify(trackId)}`);
  }
}
