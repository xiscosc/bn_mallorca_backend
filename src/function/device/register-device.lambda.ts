import * as log from 'lambda-log';
import { DeviceService } from '../../service/device.service';
import type { DeviceToken } from '../../types/components';

const deviceService = new DeviceService();
export async function handler({ type, token }: DeviceToken): Promise<void> {
  try {
    await deviceService.registerDevice(token, type);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error registering device: ${errorMessage}`);
  }
}
