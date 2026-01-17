import * as log from 'lambda-log';
import { DeviceService } from '../../service/device.service';

export async function handler(event: unknown): Promise<void> {
  try {
    const deviceService = new DeviceService();
    await deviceService.cleanDevices();
    if (event !== undefined) log.info(JSON.stringify(event));
  } catch (e: unknown) {
    log.error(`error deleting devices - ${e}`);
  }
}
