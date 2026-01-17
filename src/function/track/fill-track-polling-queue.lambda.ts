import {
  SendMessageBatchCommand,
  type SendMessageBatchCommandInput,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs/dist-types/models/models_0';
import * as log from 'lambda-log';
import { env } from '../../config/env';

export async function handler(event: unknown): Promise<void> {
  try {
    log.info(JSON.stringify(event));
    const input: SendMessageBatchCommandInput = {
      QueueUrl: env.pollQueueUrl,
      Entries: [5, 15, 25, 35, 45, 55].map((timeout) => generateMessage(timeout)),
    };

    const client = new SQSClient({});
    await client.send(new SendMessageBatchCommand(input));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Error processing Track: ${errorMessage}`);
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
