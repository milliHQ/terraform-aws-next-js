declare namespace NodeJS {
  export interface ProcessEnv {
    TABLE_REGION: string;
    TABLE_NAME_DEPLOYMENTS: string;
    TABLE_NAME_ALIASES: string;
    UPLOAD_BUCKET_ID: string;
    UPLOAD_BUCKET_REGION: string;
  }
}
