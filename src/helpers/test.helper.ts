import type {
  APIGatewayEventIdentity,
  APIGatewayEventRequestContextWithAuthorizer,
} from 'aws-lambda';

const identity: APIGatewayEventIdentity = {
  accessKey: null,
  accountId: null,
  apiKey: null,
  apiKeyId: null,
  caller: null,
  clientCert: null,
  cognitoAuthenticationProvider: null,
  cognitoAuthenticationType: null,
  cognitoIdentityId: null,
  cognitoIdentityPoolId: null,
  principalOrgId: null,
  sourceIp: '',
  user: null,
  userAgent: null,
  userArn: null,
};
export const requestContext: APIGatewayEventRequestContextWithAuthorizer<undefined> = {
  accountId: 'testAccountId',
  apiId: 'testApiId',
  authorizer: undefined,
  protocol: '',
  httpMethod: 'POST',
  identity,
  path: '/push',
  stage: '',
  requestId: '',
  requestTimeEpoch: 0,
  resourceId: '',
  resourcePath: '',
};
