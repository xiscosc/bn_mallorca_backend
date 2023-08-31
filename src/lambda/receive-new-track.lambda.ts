import { InvokeCommand, LambdaClient, InvokeCommandInput } from '@aws-sdk/client-lambda'
import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { badRequest, internalServerError, ok, stringIsValid } from './helpers/lambda.helper'
import { Track } from '../types/components'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  if (!stringIsValid(event.body)) {
    return badRequest({ message: 'Body can not be empty' })
  }

  const track: Track = JSON.parse(event.body!!)
  if (!stringIsValid(track.artist) || !stringIsValid(track.name)) {
    return badRequest({ message: 'Track info is not valid' })
  }

  try {
    const lambdaClient = new LambdaClient({})
    const invokeParams: InvokeCommandInput = { FunctionName: process.env['PROCESS_LAMBDA_ARN'], Payload: track }
    await lambdaClient.send(new InvokeCommand(invokeParams))
    return ok({ message: 'Track recorded for processing' })
  } catch (err: any) {
    log.error(`Error processing Track: ${err.toString()} - ${JSON.stringify(track)}`)
    return internalServerError({ message: 'Error processing track' })
  }
}
