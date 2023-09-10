import { InvokeCommand, InvokeCommandInput, LambdaClient } from '@aws-sdk/client-lambda'

export async function triggerAsyncLambda(lambdaArn: string, payload: object) {
  const lambdaClient = new LambdaClient({})
  const invokeParams: InvokeCommandInput = { FunctionName: lambdaArn, Payload: Buffer.from(JSON.stringify(payload)) }
  await lambdaClient.send(new InvokeCommand(invokeParams))
}
