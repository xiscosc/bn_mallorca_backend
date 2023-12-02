import { ProxyResult, APIGatewayEvent } from 'aws-lambda'
import * as log from 'lambda-log'
import { badRequest, internalServerError, ok, stringIsValid } from '../helpers/lambda.helper'
import { registerDevice } from '../service/device.service'

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const tokenInfo = JSON.parse(event.body!!)
  if (
    !tokenInfo ||
    !stringIsValid(tokenInfo.token) ||
    !stringIsValid(tokenInfo.type) ||
    ['ios', 'android'].indexOf(tokenInfo.type) < 0
  ) {
    return badRequest({ message: 'Incorrect input' })
  }

  try {
    await registerDevice(tokenInfo.token, tokenInfo.type)
    return ok({ message: 'Device registered' })
  } catch (err: any) {
    log.error(`Error getting track list: ${err.toString()}`)
    return internalServerError({ message: 'Device could not be registered' })
  }
}
