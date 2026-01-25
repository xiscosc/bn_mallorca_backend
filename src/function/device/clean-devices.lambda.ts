import { extractErrorMessage } from '../../helpers/error.helper';
import { log } from '../../helpers/logger';
import { DeviceService } from '../../service/device.service';

export async function handler(_event: unknown): Promise<void> {
  try {
    const deviceService = new DeviceService();
    const deletedTokens = await deviceService.cleanDevices();
    log.info({ deletedTokens }, 'Cleaned devices');
  } catch (err: unknown) {
    log.error({ error: extractErrorMessage(err) }, 'Error deleting devices');
    throw err;
  }
}
