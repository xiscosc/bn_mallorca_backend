import * as log from 'lambda-log'
import { removeDisabledDevices } from '../service/device.service'

export async function handler(event: any): Promise<any> {
  try {
    if (event !== undefined) log.info(JSON.stringify(event))
    await removeDisabledDevices()
  } catch (e: any) {
    log.error('error deleting devices', e)
  }
}
