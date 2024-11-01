import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export type BnBuckets = {
  albumArtBucket: Bucket
}

export function createBuckets(scope: Construct, envName: string): BnBuckets {
  const albumArtBucket = new Bucket(scope, `${envName}-albumArtBucket`, {
    bucketName: `${envName}-bnmca-albums`,
    publicReadAccess: true,
    websiteIndexDocument: 'index.html',
    blockPublicAccess: new BlockPublicAccess({
      blockPublicPolicy: false,
      blockPublicAcls: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    }),
  })

  return {
    albumArtBucket,
  }
}
