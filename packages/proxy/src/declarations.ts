declare namespace NodeJS {
  export interface ProcessEnv {
    ROUTES: string;
    LAMBDA_ROUTES: string;
    API_GATEWAY_ENDPOINT: string;
  }
}
