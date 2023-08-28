import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import { getBadRequest, stringIsValid } from './helpers'
import { Track } from '../types/components'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  if (!stringIsValid(event.body)) {
    return getBadRequest({ message: 'Body can not be empty' })
  }

  const track: Track = JSON.parse(event.body!!)
  if (!stringIsValid(track.artist) || !stringIsValid(track.name)) {
    return getBadRequest({ message: 'Track info is not valid' })
  }

  const lambdaClient = new LambdaClient({})
  await lambdaClient.send(new InvokeCommand({ FunctionName: process.env['PROCESS_LAMBDA_ARN'], Payload: track }))
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Track recorded for processing' }),
  }
}
