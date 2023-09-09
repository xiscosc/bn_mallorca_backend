import { when } from 'jest-when'
import { handler } from './cache-album-art.lambda'
import { TrackService } from '../service/track.service'
import { Track } from '../types/components'

jest.mock('lambda-log')
jest.mock('../service/track.service')

const fullTrack: Track = { id: '1234', name: 'n', artist: 'a', albumArt: [{ size: '1x1', downloadUrl: 'url' }] }
test('when track is not received it throws an error', async () => {
  await expect(handler(undefined)).rejects.toThrow('Cache album art: invalid track - undefined')
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(0)
})

test('when track is not received {} it throws an error', async () => {
  // @ts-ignore
  await expect(handler({})).rejects.toThrow('Cache album art: invalid track - {}')
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(0)
})

test('when track has no id it throws an error', async () => {
  // @ts-ignore
  await expect(handler({ id: undefined })).rejects.toThrow('Cache album art: invalid track - {}')
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(0)
})

test('when track has no album art it throws an error', async () => {
  // @ts-ignore
  await expect(handler({ id: '1234' })).rejects.toThrow(
    `Cache album art: invalid track - ${JSON.stringify({ id: '1234' })}`,
  )
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(0)
})

test('when track has empty album art it throws an error', async () => {
  // @ts-ignore
  await expect(handler({ id: '1234', albumArt: [] })).rejects.toThrow(
    `Cache album art: invalid track - ${JSON.stringify({ id: '1234', albumArt: [] })}`,
  )
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(0)
})

test('Track is correctly processed', async () => {
  await handler(fullTrack)
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(1)
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledWith(fullTrack.albumArt, fullTrack.id)
})

test('Error from track service', async () => {
  when(TrackService.prototype.cacheAlbumArt).mockRejectedValue(new Error('error track service'))

  await expect(handler(fullTrack)).rejects.toThrow(
    `Error caching track album art: Error: error track service - ${JSON.stringify(fullTrack)}`,
  )
  expect(TrackService.prototype.cacheAlbumArt).toBeCalledTimes(1)
})
