import {
  BasePathMapping,
  DomainName,
  EndpointType,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import type { Construct } from 'constructs';
import type { BnLambdas } from './lambda.construct';

export function createApi(
  scope: Construct,
  envName: string,
  apiDomainName: string,
  apiDomainAPIGatewayDomainName: string,
  apiDomainHostedZoneId: string,
  {
    getTrackListLambda,
    getScheduleLambda,
    triggerRegisterDeviceLambda,
    unregisterDeviceLambda,
  }: BnLambdas,
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
  });

  const domain = DomainName.fromDomainNameAttributes(scope, `${envName}-apiDomain`, {
    domainName: apiDomainName,
    domainNameAliasHostedZoneId: apiDomainHostedZoneId,
    domainNameAliasTarget: apiDomainAPIGatewayDomainName,
  });

  const getTrackListIntegration = new LambdaIntegration(getTrackListLambda);
  const registerDeviceIntegration = new LambdaIntegration(triggerRegisterDeviceLambda);
  const unregisterDeviceIntegration = new LambdaIntegration(unregisterDeviceLambda);
  const getScheduleIntegration = new LambdaIntegration(getScheduleLambda);
  const apiV1 = api.root.addResource('api').addResource('v1');
  const trackListResource = apiV1.addResource('tracklist');
  const scheduleResource = apiV1.addResource('schedule');
  const registerResource = apiV1.addResource('register');
  const unregisterResource = apiV1.addResource('unregister');
  trackListResource.addMethod('GET', getTrackListIntegration);
  scheduleResource.addMethod('GET', getScheduleIntegration);
  registerResource.addMethod('POST', registerDeviceIntegration);
  unregisterResource.addMethod('POST', unregisterDeviceIntegration);

  new BasePathMapping(scope, `${envName}-apiPathMapping`, {
    domainName: domain,
    restApi: api,
    stage: api.deploymentStage,
  });
}
