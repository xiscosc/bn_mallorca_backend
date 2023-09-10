import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda'
import { when } from 'jest-when'
import { handler } from './api-authorizer.lambda'
import { AuthService } from '../service/auth.service'

jest.mock('../service/auth.service')
jest.mock('lambda-log')

beforeEach(() => {
  jest.clearAllMocks()
})

const event: APIGatewayTokenAuthorizerEvent = {
  authorizationToken: 'token1',
  type: 'TOKEN',
  methodArn: 'eu-central-1:test1',
}

test('Error decoding JWT', async () => {
  when(AuthService.prototype.isValidJwt).mockRejectedValue('Error 1')
  await expect(handler(event)).rejects.toThrow('Error while verifying the jwt: Error 1')
  expect(AuthService.prototype.isValidJwt).toBeCalledTimes(1)
})

test('Test valid JWT', async () => {
  const expectedStatement = {
    Action: 'execute-api:Invoke',
    Effect: 'Allow',
    Resource: event.methodArn,
  }

  when(AuthService.prototype.isValidJwt).mockResolvedValue(true)
  const response = await handler(event)
  expect(AuthService.prototype.isValidJwt).toBeCalledTimes(1)
  expect(AuthService.prototype.isValidJwt).toBeCalledWith(event.authorizationToken)
  expect(response.policyDocument.Statement[0]).toEqual(expectedStatement)
})

test('Test invalid JWT', async () => {
  const expectedStatement = {
    Action: 'execute-api:Invoke',
    Effect: 'Deny',
    Resource: event.methodArn,
  }

  when(AuthService.prototype.isValidJwt).mockResolvedValue(false)
  const response = await handler(event)
  expect(AuthService.prototype.isValidJwt).toBeCalledTimes(1)
  expect(AuthService.prototype.isValidJwt).toBeCalledWith(event.authorizationToken)
  expect(response.policyDocument.Statement[0]).toEqual(expectedStatement)
})
