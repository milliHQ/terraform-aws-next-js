declare namespace NodeJS {
  export interface ProcessEnv {
    TARGET_BUCKET: string;
    DISTRIBUTION_ID: string;
    SQS_QUEUE_URL: string;
    DEPLOY_STATUS_SNS_ARN: string;
    TABLE_REGION: string;
    TABLE_NAME_DEPLOYMENTS: string;
  }
}
