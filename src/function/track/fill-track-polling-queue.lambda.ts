import { SendMessageBatchCommand, SendMessageBatchCommandInput, SQSClient } from '@aws-sdk/client-sqs'
import { SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs/dist-types/models/models_0'
import * as log from 'lambda-log'
import { env } from '../../config/env'

export async function handler(event: any): Promise<any> {
  try {
    log.info(JSON.stringify(event))
    const input: SendMessageBatchCommandInput = {
      QueueUrl: env.pollQueueUrl,
      Entries: [5, 15, 25, 35, 45, 55].map(timeout => generateMessage(timeout)),
    }

    const client = new SQSClient({})
    await client.send(new SendMessageBatchCommand(input))
  } catch (err: any) {
    log.error(`Error processing Track: ${err.toString()}`)
  }
}

function generateMessage(timeout: number): SendMessageBatchRequestEntry {
  const id = `${Date.now()}-${timeout}`
  return {
    Id: id,
    MessageBody: id,
    DelaySeconds: timeout,
  }
}
