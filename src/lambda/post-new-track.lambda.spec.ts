import { APIGatewayEvent } from 'aws-lambda'
import { when } from 'jest-when'
import { handler } from './post-new-track.lambda'
import { requestContext } from '../helpers/test.helper'
import { TrackService } from '../service/track.service'
import { Track } from '../types/components'

jest.mock('lambda-log')
jest.mock('../service/track.service')

function getApiGatewayEvent(body: string | null): APIGatewayEvent {
  return {
    body,
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
}

test('when track is not received it returns a bad request', async () => {
  const response = await handler(getApiGatewayEvent(null))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track empty it returns a bad request', async () => {
  const emptyTrack: Track = { name: '', artist: '' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(emptyTrack)))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is missing the artist it returns a bad request', async () => {
  const faultyTrack = { name: 'Test1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is missing the artist it returns a bad request', async () => {
  const faultyTrack = { artist: 'Test1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track missing all properties it returns a bad request', async () => {
  const faultyTrack = {}
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is correct, it triggers the processing lambda', async () => {
  const track: Track = { name: 'Test1', artist: 'ATest 1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(track)))
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledTimes(1)
  expect(TrackService.triggerAsyncTrackProcessing).toBeCalledWith(track)
  expect(response.statusCode).toBe(200)
})

test('when track is correct but it can not trigger the lambda, it returns a 500', async () => {
  when(TrackService.triggerAsyncTrackProcessing).mockRejectedValue(new Error('error processing'))
  const track: Track = { name: 'Test1', artist: 'ATest 1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(track)))
  expect(response.statusCode).toBe(500)
})
