import { when } from 'jest-when'
import { handler } from './process-new-track.lambda'
import { TrackService } from '../service/track.service'
import { Track } from '../types/components'

jest.mock('lambda-log')
jest.mock('../service/track.service')

const centovaTrack: Track = { name: 'n', artist: 'a' }
test('when track is not received it throws an error', async () => {
  await expect(handler(undefined)).rejects.toThrow('Process track: Artist or name are invalid - undefined')
  expect(TrackService.prototype.processTrack).toBeCalledTimes(0)
})

test('when track is not received {} it throws an error', async () => {
  // @ts-ignore
  await expect(handler({})).rejects.toThrow('Process track: Artist or name are invalid - {}')
  expect(TrackService.prototype.processTrack).toBeCalledTimes(0)
})

test('when track is not received (only artist) it throws an error', async () => {
  // @ts-ignore
  await expect(handler({ artist: 'a' })).rejects.toThrow(
    `Process track: Artist or name are invalid - ${JSON.stringify({ artist: 'a' })}`,
  )
  expect(TrackService.prototype.processTrack).toBeCalledTimes(0)
})

test('when track is not received (only name) it throws an error', async () => {
  // @ts-ignore
  await expect(handler({ name: 'a' })).rejects.toThrow(
    `Process track: Artist or name are invalid - ${JSON.stringify({ name: 'a' })}`,
  )
  expect(TrackService.prototype.processTrack).toBeCalledTimes(0)
})

test('Track is correctly processed', async () => {
  await handler(centovaTrack)
  expect(TrackService.prototype.processTrack).toBeCalledTimes(1)
  expect(TrackService.prototype.processTrack).toBeCalledWith(centovaTrack)
})

test('Error from track service', async () => {
  when(TrackService.prototype.processTrack).mockRejectedValue(new Error('error track service'))

  await expect(handler(centovaTrack)).rejects.toThrow(
    `Error processing Track: Error: error track service - ${JSON.stringify(centovaTrack)}`,
  )
  expect(TrackService.prototype.processTrack).toBeCalledTimes(1)
})
