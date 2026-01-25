import {
  SendMessageBatchCommand,
  type SendMessageBatchCommandInput,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs/dist-types/models/models_0';
import { env } from '../../config/env';
import { extractErrorMessage } from '../../helpers/error.helper';
import { log } from '../../helpers/logger';

export async function handler(_event: unknown): Promise<void> {
  try {
    const input: SendMessageBatchCommandInput = {
      QueueUrl: env.pollQueueUrl,
      Entries: [5, 15, 25, 35, 45, 55].map((timeout) => generateMessage(timeout)),
    };

    const client = new SQSClient({});
    const result = await client.send(new SendMessageBatchCommand(input));
    log.info(
      { successful: result.Successful?.length ?? 0, failed: result.Failed?.length ?? 0 },
      'Filled polling queue',
    );
  } catch (err: unknown) {
    log.error({ error: extractErrorMessage(err) }, 'Error filling polling queue');
    throw err;
  }
}

function generateMessage(timeout: number): SendMessageBatchRequestEntry {
  const id = `${Date.now()}-${timeout}`;
  return {
    Id: id,
    MessageBody: id,
    DelaySeconds: timeout,
  };
}
