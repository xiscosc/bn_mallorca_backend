import {
  BasePathMapping,
  DomainName,
  EndpointType,
  LambdaIntegration,
  Model,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'
import { BnLambdas } from './lambda.construct'

export function createApi(
  scope: Construct,
  envName: string,
  apiDomainName: string,
  apiDomainAPIGatewayDomainName: string,
  apiDomainHostedZoneId: string,
  { getTackListLambda, getScheduleLambda, triggerRegisterDeviceLambda, unregisterDeviceLambda }: BnLambdas,
) {
  const api = new RestApi(scope, `${envName}-trackListApi`, {
    restApiName: `TrackList API - ${envName}`,
    endpointConfiguration: {
      types: [EndpointType.REGIONAL],
    },
    deployOptions: {
      throttlingBurstLimit: 50,
      throttlingRateLimit: 30,
    },
  })

  const domain = DomainName.fromDomainNameAttributes(scope, `${envName}-apiDomain`, {
    domainName: apiDomainName,
    domainNameAliasHostedZoneId: apiDomainHostedZoneId,
    domainNameAliasTarget: apiDomainAPIGatewayDomainName,
  })

  const getTrackListIntegration = new LambdaIntegration(getTackListLambda)

  // Trigger registration async to speed up
  const registerDeviceIntegration = new LambdaIntegration(triggerRegisterDeviceLambda, {
    requestParameters: {
      'integration.request.header.X-Amz-Invocation-Type': "'Event'",
    },
    integrationResponses: [
      {
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({ message: 'Device registered' }),
        },
      },
    ],
  })

  const unregisterDeviceIntegration = new LambdaIntegration(unregisterDeviceLambda)
  const getScheduleIntegration = new LambdaIntegration(getScheduleLambda)
  const apiV1 = api.root.addResource('api').addResource('v1')
  const trackListResource = apiV1.addResource('tracklist')
  const scheduleResource = apiV1.addResource('schedule')
  const registerResource = apiV1.addResource('register')
  const unregisterResource = apiV1.addResource('unregister')
  trackListResource.addMethod('GET', getTrackListIntegration)
  scheduleResource.addMethod('GET', getScheduleIntegration)
  unregisterResource.addMethod('POST', unregisterDeviceIntegration)

  registerResource.addMethod('POST', registerDeviceIntegration, {
    methodResponses: [
      {
        statusCode: '200',
        responseModels: {
          'application/json': Model.EMPTY_MODEL,
        },
      },
    ],
  })

  // eslint-disable-next-line no-new
  new BasePathMapping(scope, `${envName}-apiPathMapping`, {
    domainName: domain,
    restApi: api,
    stage: api.deploymentStage,
  })
}
