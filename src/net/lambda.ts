import { InvokeCommand, type InvokeCommandInput, LambdaClient } from '@aws-sdk/client-lambda';

export async function triggerAsyncLambda(lambdaArn: string, payload: object) {
  const lambdaClient = new LambdaClient({});
  const invokeParams: InvokeCommandInput = {
    FunctionName: lambdaArn,
    Payload: Buffer.from(JSON.stringify(payload)),
    InvocationType: 'Event',
  };
  await lambdaClient.send(new InvokeCommand(invokeParams));
}
