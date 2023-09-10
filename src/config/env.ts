export const env = {
  albumArtTable: process.env['ALBUM_ART_TABLE'] ?? '',
  albumArtBucket: process.env['ALBUM_ART_BUCKET'] ?? '',
  trackListTable: process.env['TRACK_LIST_TABLE'] ?? '',
  processLambdaArn: process.env['PROCESS_LAMBDA_ARN'] ?? '',
  cacheLambdaArn: process.env['CACHE_LAMBDA_ARN'] ?? '',
  notificationTopicArn: process.env['NOTIFICATION_TOPIC'] ?? '',
  spotifyClientIdArn: process.env['SPOTIFY_CLIENT_ID'] ?? '',
  spotifySecretIdArn: process.env['SPOTIFY_SECRET_ID'] ?? '',
  jwtSecretArn: process.env['JWT_SECRET_ARN'] ?? '',
}
