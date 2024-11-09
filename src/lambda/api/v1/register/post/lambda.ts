import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { env } from '../../../../../config/env'
import { badRequest, internalServerError, ok, stringIsValid } from '../../../../../helpers/lambda.helper'
import { triggerAsyncLambda } from '../../../../../net/lambda'
import { DeviceToken } from '../../../../../types/components'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const tokenInfo: DeviceToken = JSON.parse(event.body!!)
  if (
    !tokenInfo ||
    !stringIsValid(tokenInfo.token) ||
    !stringIsValid(tokenInfo.type) ||
    ['ios', 'android'].indexOf(tokenInfo.type) < 0
  ) {
    return badRequest({ message: 'Incorrect input' })
  }

  try {
    await triggerAsyncLambda(env.registerDeviceLambdaArn, { token: tokenInfo.token, type: tokenInfo.type })
    return ok({ message: 'Device registered' })
  } catch (err: any) {
    log.error(`Error registering device: ${err.toString()}`)
    return internalServerError({ message: 'Device could not be registered' })
  }
}
