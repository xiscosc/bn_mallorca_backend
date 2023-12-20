import * as log from 'lambda-log'
import { removeDisabledDevices } from '../service/device.service'

export async function handler(event: any): Promise<any> {
  log.info(JSON.stringify(event))
  await removeDisabledDevices()
}
