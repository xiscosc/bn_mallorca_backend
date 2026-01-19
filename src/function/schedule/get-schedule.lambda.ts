import type { ProxyResult } from 'aws-lambda';
import { extractErrorMessage } from '../../helpers/error.helper';
import { internalServerError, ok } from '../../helpers/lambda.helper';
import { log } from '../../helpers/logger';
import { ScheduleService } from '../../service/schedule.service';
import type { ScheduleResponse } from '../../types/components';

export async function handler(): Promise<ProxyResult> {
  try {
    const scheduleService = new ScheduleService();
    const days = await scheduleService.getSchedule();
    const response: ScheduleResponse = { days };
    return ok(response);
  } catch (err: unknown) {
    log.error(`Error getting schedule: ${extractErrorMessage(err)}`);
    return internalServerError({ message: 'Error obtaining the schedule' });
  }
}
