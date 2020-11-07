declare namespace NodeJS {
  export interface ProcessEnv {
    TARGET_BUCKET: string;
    EXPIRE_AFTER_DAYS: string;
    DISTRIBUTION_ID: string;
  }
}
