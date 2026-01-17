import { App } from 'aws-cdk-lib';
import { BnMallorcaStack } from './bn-mallorca-stack';

export class BnMallorcaApp extends App {
  constructor() {
    super();

    const props = {
      envName: BnMallorcaApp.getFromEnv('ENV_NAME'),
      spotifyClientIdArn: BnMallorcaApp.getFromEnv('SPOTIFY_CLIENT_ID_ARN'),
      spotifySecretArn: BnMallorcaApp.getFromEnv('SPOTIFY_SECRET_ID_ARN'),
      apiDomainName: BnMallorcaApp.getFromEnv('API_DOMAIN_NAME'),
      apiDomainAPIGatewayDomainName: BnMallorcaApp.getFromEnv('API_DOMAIN_GATEWAY_NAME'),
      apiDomainHostedZoneId: BnMallorcaApp.getFromEnv('API_DOMAIN_HOSTED_ZONE_ID'),
      centovaUrl: BnMallorcaApp.getFromEnv('CENTOVA_URL'),
      centovaStreamUrl: BnMallorcaApp.getFromEnv('CENTOVA_STREAM_URL'),
      trackSource: BnMallorcaApp.getFromEnv('TRACK_SOURCE'),
      iosAppSns: BnMallorcaApp.getFromEnv('IOS_APP_SNS'),
      androidAppSns: BnMallorcaApp.getFromEnv('ANDROID_APP_SNS'),
    };

    new BnMallorcaStack(this, `${props.envName}-bnmallorca-stack`, props);
  }

  private static getFromEnv(key: string): string {
    if (process.env[key] != null) {
      return process.env[key];
    }

    throw Error(`Undefined env ${key}`);
  }
}
