import type { APIGatewayEvent, ProxyResult } from 'aws-lambda';
import { env } from '../../config/env';
import { extractErrorMessage } from '../../helpers/error.helper';
import { badRequest, internalServerError, ok, stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { triggerAsyncLambda } from '../../net/lambda';
import type { DeviceToken } from '../../types/components';

export async function handler(event: APIGatewayEvent): Promise<ProxyResult> {
  const tokenInfo: DeviceToken = JSON.parse(event.body!);
  if (
    !tokenInfo ||
    !stringIsValid(tokenInfo.token) ||
    !stringIsValid(tokenInfo.type) ||
    ['ios', 'android'].indexOf(tokenInfo.type) < 0
  ) {
    return badRequest({ message: 'Incorrect input' });
  }

  try {
    await triggerAsyncLambda(env.registerDeviceLambdaArn, {
      token: tokenInfo.token,
      type: tokenInfo.type,
    });
    return ok({ message: 'Device registered' });
  } catch (err: unknown) {
    log.error(`Error registering device: ${extractErrorMessage(err)}`);
    return internalServerError({ message: 'Device could not be registered' });
  }
}
