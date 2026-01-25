import { extractErrorMessage } from '../../helpers/error.helper';
import { stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { AlbumArtService, type IAlbumCacheRequest } from '../../service/album-art.service';

export async function handler({
  trackId,
  trackName,
  artist,
  albumArt,
}: IAlbumCacheRequest): Promise<void> {
  if (!stringIsValid(trackId) || albumArt == null || albumArt.length === 0) {
    log.error({ trackId }, 'Cache album art: invalid track');
    throw Error(`Cache album art: invalid track - ${JSON.stringify(trackId)}`);
  }

  try {
    const albumArtService = new AlbumArtService();
    const storedSizes = await albumArtService.cacheAlbumArt({
      trackId,
      trackName,
      artist,
      albumArt,
    });
    log.info(
      { trackId, track: trackName, artist, cached: storedSizes.length > 0 },
      'Cached album art',
    );
  } catch (err: unknown) {
    const errorMessage = extractErrorMessage(err);
    log.error({ trackId, error: errorMessage }, 'Error caching track album art');
    throw Error(`Error caching track album art: ${errorMessage} - ${JSON.stringify(trackId)}`);
  }
}
