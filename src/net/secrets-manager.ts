import {
  GetSecretValueCommand,
  type GetSecretValueCommandInput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export async function getSecretValue(secretArn: string): Promise<string | undefined> {
  const client = new SecretsManagerClient({});
  const input: GetSecretValueCommandInput = {
    SecretId: secretArn,
  };

  const secretResult = await client.send(new GetSecretValueCommand(input));
  return secretResult.SecretString;
}
