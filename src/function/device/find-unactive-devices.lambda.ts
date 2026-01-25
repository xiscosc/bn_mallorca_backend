import { extractErrorMessage } from '../../helpers/error.helper';
import { log } from '../../helpers/logger';
import { DeviceService } from '../../service/device.service';

export async function handler(_event: unknown): Promise<void> {
  try {
    const deviceService = new DeviceService();
    const markedTokens = await deviceService.markUnactiveDevices();
    log.info({ markedTokens }, 'Marked unactive devices');
  } catch (err: unknown) {
    log.error({ error: extractErrorMessage(err) }, 'Error marking devices');
    throw err;
  }
}
