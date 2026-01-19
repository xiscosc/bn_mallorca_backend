import type { APIGatewayEvent, ProxyResult } from 'aws-lambda';
import { extractErrorMessage } from '../../helpers/error.helper';
import { badRequest, internalServerError, ok, stringIsValid } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { DeviceService } from '../../service/device.service';
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
    const deviceService = new DeviceService();
    await deviceService.unregisterDevice(tokenInfo.token);
    return ok({ message: 'Device unregistered' });
  } catch (err: unknown) {
    log.error(`Error unregistering device: ${extractErrorMessage(err)}`);
    return internalServerError({ message: 'Device could not be unregistered' });
  }
}
