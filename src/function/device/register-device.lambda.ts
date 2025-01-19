import * as log from 'lambda-log'
import { DeviceService } from '../../service/device.service'
import { DeviceToken } from '../../types/components'

const deviceService = new DeviceService()
export async function handler({ type, token }: DeviceToken): Promise<any> {
  try {
    await deviceService.registerDevice(token, type)
  } catch (err: any) {
    log.error(`Error registering device: ${err.toString()}`)
  }
}
