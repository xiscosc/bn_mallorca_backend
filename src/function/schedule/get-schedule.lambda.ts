import type { ProxyResult } from 'aws-lambda';
import * as log from 'lambda-log';
import { internalServerError, ok } from '../../helpers/lambda.helper';
import { ScheduleService } from '../../service/schedule.service';
import type { ScheduleResponse } from '../../types/components';

export async function handler(): Promise<ProxyResult> {
  try {
    const scheduleService = new ScheduleService();
    const days = await scheduleService.getSchedule();
    const response: ScheduleResponse = { days };
    return ok(response);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error getting schedule: ${errorMessage}`);
    return internalServerError({ message: 'Error obtaining the schedule' });
  }
}
