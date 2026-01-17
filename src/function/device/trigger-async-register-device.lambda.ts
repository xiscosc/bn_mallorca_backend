import type { APIGatewayEvent, ProxyResult } from 'aws-lambda';
import * as log from 'lambda-log';
import { env } from '../../config/env';
import { badRequest, internalServerError, ok, stringIsValid } from '../../helpers/lambda.helper';
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
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error registering device: ${errorMessage}`);
    return internalServerError({ message: 'Device could not be registered' });
  }
}
