import { ProxyResult } from 'aws-lambda'
import * as log from 'lambda-log'
import { internalServerError, ok } from '../../helpers/lambda.helper'
import { ScheduleService } from '../../service/schedule.service'
import { ScheduleResponse } from '../../types/components'

export async function handler(): Promise<ProxyResult> {
  try {
    const scheduleService = new ScheduleService()
    const days = await scheduleService.getSchedule()
    const response: ScheduleResponse = { days }
    return ok(response)
  } catch (err: any) {
    log.error(`Error getting schedule: ${err.toString()}`)
    return internalServerError({ message: 'Error obtaining the schedule' })
  }
}
