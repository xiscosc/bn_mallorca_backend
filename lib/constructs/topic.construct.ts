import { Topic } from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';

export type BnTopics = {
  notificationsTopic: Topic;
};

export function createTopics(scope: Construct, envName: string): BnTopics {
  const notificationsTopic = new Topic(scope, `${envName}-notificationTopic`);

  return {
    notificationsTopic,
  };
}
