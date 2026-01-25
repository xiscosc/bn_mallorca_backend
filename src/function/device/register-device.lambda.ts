import { extractErrorMessage } from '../../helpers/error.helper';
import { log } from '../../helpers/logger';
import { DeviceService } from '../../service/device.service';
import type { DeviceToken } from '../../types/components';

const deviceService = new DeviceService();
export async function handler({ type, token }: DeviceToken): Promise<void> {
  try {
    const result = await deviceService.registerDevice(token, type);
    log.info(result, 'Registered device');
  } catch (err: unknown) {
    log.error({ error: extractErrorMessage(err) }, 'Error registering device');
    throw err;
  }
}
