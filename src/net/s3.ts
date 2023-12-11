import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env'
import { AlbumArt } from '../types/components'

let s3Client: S3Client | undefined

export async function storeAlbumArtInS3(trackId: string, size: string, body: Buffer) {
  const input: PutObjectCommandInput = {
    Key: `${trackId}/${size}`,
    Bucket: env.albumArtBucket,
    Body: body,
    ContentType: 'image/jpeg',
  }

  await getS3Client().send(new PutObjectCommand(input))
}

export async function getAlbumArtWithUrl(trackId: string, size: string): Promise<AlbumArt> {
  const downloadUrl = `https://${env.albumArtBucket}.s3.amazonaws.com/${trackId}/${size}`
  return { size, downloadUrl }
}

function getS3Client(): S3Client {
  if (s3Client === undefined) {
    s3Client = new S3Client({})
  }

  return s3Client
}
