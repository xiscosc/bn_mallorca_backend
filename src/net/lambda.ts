import { InvokeCommand, InvokeCommandInput, LambdaClient } from '@aws-sdk/client-lambda'

export async function triggerAsyncLambda(lambdaArn: string, payload: any) {
  const lambdaClient = new LambdaClient({})
  const invokeParams: InvokeCommandInput = { FunctionName: lambdaArn, Payload: payload }
  await lambdaClient.send(new InvokeCommand(invokeParams))
}
