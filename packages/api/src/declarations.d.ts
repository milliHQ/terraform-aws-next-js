declare namespace NodeJS {
  export interface ProcessEnv {
    TABLE_REGION: string;
    TABLE_NAME_DEPLOYMENTS: string;
    TABLE_NAME_ALIASES: string;
    UPLOAD_BUCKET_ID: string;
    UPLOAD_BUCKET_REGION: string;

    // Reserved environment variables from AWS Lambda
    // @see {@link https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime}
    AWS_LAMBDA_LOG_GROUP_NAME: string;
    AWS_LAMBDA_LOG_STREAM_NAME: string;
    AWS_REGION: string;
  }
}
