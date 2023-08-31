import { LambdaClient } from '@aws-sdk/client-lambda'
import { APIGatewayEvent } from 'aws-lambda'
import { when } from 'jest-when'
import { requestContext } from './helpers/test.helper'
import { handler } from './receive-new-track.lambda'
import { Track } from '../types/components'

jest.mock('@aws-sdk/client-lambda')
jest.mock('lambda-log')

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
  expect(LambdaClient.prototype.send).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track empty it returns a bad request', async () => {
  const emptyTrack: Track = { name: '', artist: '' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(emptyTrack)))
  expect(LambdaClient.prototype.send).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is missing the artist it returns a bad request', async () => {
  const faultyTrack = { name: 'Test1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(LambdaClient.prototype.send).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is missing the artist it returns a bad request', async () => {
  const faultyTrack = { artist: 'Test1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(LambdaClient.prototype.send).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track missing all properties it returns a bad request', async () => {
  const faultyTrack = {}
  const response = await handler(getApiGatewayEvent(JSON.stringify(faultyTrack)))
  expect(LambdaClient.prototype.send).toBeCalledTimes(0)
  expect(response.statusCode).toBe(400)
})

test('when track is correct, it triggers the processing lambda', async () => {
  const track: Track = { name: 'Test1', artist: 'ATest 1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(track)))
  expect(LambdaClient.prototype.send).toBeCalledTimes(1)
  expect(response.statusCode).toBe(200)
})

test('when track is correct but it can trigger the lambda it returns a 500', async () => {
  // @ts-ignore
  when(LambdaClient.prototype.send).mockRejectedValue(new Error('error with aws'))
  const track: Track = { name: 'Test1', artist: 'ATest 1' }
  const response = await handler(getApiGatewayEvent(JSON.stringify(track)))
  expect(response.statusCode).toBe(500)
})
