import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

export type BnSecrets = {
  spotifyClientId: ISecret
  spotifySecret: ISecret
}

export function createSecrets(
  scope: Construct,
  envName: string,
  spotifyClientIdArn: string,
  spotifySecretArn: string,
): BnSecrets {
  const spotifyClientId = Secret.fromSecretCompleteArn(scope, `${envName}-spotify-client-id`, spotifyClientIdArn)
  const spotifySecret = Secret.fromSecretCompleteArn(scope, `${envName}-spotify-secret`, spotifySecretArn)

  return {
    spotifyClientId,
    spotifySecret,
  }
}
