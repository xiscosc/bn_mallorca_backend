import { APIGatewayTokenAuthorizerEvent, APIGatewayIAMAuthorizerResult } from 'aws-lambda'
import * as log from 'lambda-log'
import { AuthService } from '../service/auth.service'

const authService: AuthService = new AuthService()
export async function handler(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayIAMAuthorizerResult> {
  try {
    return {
      principalId: '$context.authorizer.principalId',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: (await authService.isValidJwt(event.authorizationToken)) ? 'Allow' : 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
    }
  } catch (err: any) {
    log.error(`Error while verifying the jwt: ${err.toString()}`)
    throw new Error(`Error while verifying the jwt: ${err.toString()}`)
  }
}
