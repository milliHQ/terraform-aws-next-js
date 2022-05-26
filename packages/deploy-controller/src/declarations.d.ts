declare namespace NodeJS {
  export interface ProcessEnv {
    TABLE_REGION: string;
    TABLE_NAME_DEPLOYMENTS: string;
    TABLE_NAME_ALIASES: string;
    MULTI_DEPLOYMENTS_BASE_DOMAIN?: string;
  }
}
