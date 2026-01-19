import { extractErrorMessage } from '../../helpers/error.helper';
import { log } from '../../helpers/logger';
import { DeviceService } from '../../service/device.service';
import type { DeviceToken } from '../../types/components';

const deviceService = new DeviceService();
export async function handler({ type, token }: DeviceToken): Promise<void> {
  try {
    await deviceService.registerDevice(token, type);
  } catch (err: unknown) {
    log.error(`Error registering device: ${extractErrorMessage(err)}`);
  }
}
