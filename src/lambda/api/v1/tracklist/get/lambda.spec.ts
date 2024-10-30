import { APIGatewayEvent } from 'aws-lambda'
import { when } from 'jest-when'
import { handler } from './lambda'
import { requestContext } from '../../../../../helpers/test.helper'
import { TrackService } from '../../../../../service/track.service'
import { Track, TrackListResponse } from '../../../../../types/components'

jest.mock('lambda-log')
jest.mock('../service/track.service')

const id = '123456'
const ts = 123456
const track: Track = { id, timestamp: ts, name: 'n', artist: 'a', albumArt: [] }

function getApiGatewayEvent(limit: number | null = null, setQueryParams: boolean = false): APIGatewayEvent {
  const event: APIGatewayEvent = {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/push',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext,
    resource: '',
  }

  if (setQueryParams || limit !== null) {
    event.queryStringParameters = {}
    if (limit !== null) {
      event.queryStringParameters['limit'] = `${limit}`
    }
  }

  return event
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('when limit is 0 returns bad request', async () => {
  const response = await handler(getApiGatewayEvent(0))
  expect(TrackService.prototype.getTrackList).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when limit is negative returns bad request', async () => {
  const response = await handler(getApiGatewayEvent(-55))
  expect(TrackService.prototype.getTrackList).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when limit is greater than 25 returns bad request', async () => {
  const response = await handler(getApiGatewayEvent(26))
  expect(TrackService.prototype.getTrackList).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when limit is not set but query params are, it returns a track list', async () => {
  await testCorrectScenario(getApiGatewayEvent(null, true), 1)
})

test('when limits and query params are not set, it returns a track list ', async () => {
  await testCorrectScenario(getApiGatewayEvent(), 1)
})

test('when limits is set, it returns a track list', async () => {
  await testCorrectScenario(getApiGatewayEvent(25), 25)
})

test('when service returns error, it returns internal server error ', async () => {
  when(TrackService.prototype.getTrackList).mockRejectedValue(new Error('test error'))
  const response = await handler(getApiGatewayEvent(12))
  expect(TrackService.prototype.getTrackList).toBeCalledTimes(1)
  expect(response.statusCode).toBe(500)
})

async function testCorrectScenario(event: APIGatewayEvent, limit: number) {
  when(TrackService.prototype.getTrackList).mockResolvedValue({ trackList: [track] })
  const response = await handler(event)
  expect(TrackService.prototype.getTrackList).toBeCalledTimes(1)
  expect(TrackService.prototype.getTrackList).toBeCalledWith(limit, undefined)
  expect(response.statusCode).toBe(200)
  const body: TrackListResponse = JSON.parse(response.body)
  expect(body.count).toBe(1)
  expect(body.tracks).toEqual([track])
}
