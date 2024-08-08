import * as log from 'lambda-log'
import { DeviceService } from '../service/device.service'

export async function handler(event: any): Promise<any> {
  try {
    const deviceService = new DeviceService()
    await deviceService.findDisabledDevices()
    if (event !== undefined) log.info(JSON.stringify(event))
  } catch (e: any) {
    log.error(`error deleting devices - ${e}`)
  }
}
