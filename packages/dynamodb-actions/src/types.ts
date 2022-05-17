export type DeploymentItem = {
  /**
   * DeploymentId (Partition Key)
   */
  PK: string;
  /**
   * CreateDate (Sort Key)
   */
  SK: string;
  /**
   * Status of the deployment
   */
  Status:
    | 'INITIALIZED'
    | 'CREATE_IN_PROGRESS'
    | 'CREATE_COMPLETE'
    | 'CREATE_FAILED'
    | 'FINISHED';
  /**
   * Version of the item
   */
  ItemVersion: number;
  /**
   * Stringified object that contains the route config.
   */
  Routes: string;
  /**
   * Stringified object that contains the routes that should be served from
   * Lambda functions.
   */
  LambdaRoutes: string;
  /**
   * Stringified object that contains the routes that are prerendered.
   */
  Prerenders: string;
  /**
   * The (fixed) deployment alias that was assigned on creation.
   * Only present if multi-deployment feature is enabled.
   */
  DeploymentAlias?: string;
};

export type AliasItem = {
  /**
   * Alias (Partition Key), is always a full domain name,
   * e.g. my-sub.example.com
   */
  PK: string;
  /**
   * DeploymentId#CreateDate (Sort Key)
   */
  SK: string;
  /**
   * Version of the item
   */
  ItemVersion: number;
  /**
   * Stringified object that contains the route config.
   */
  Routes: string;
  /**
   * Stringified object that contains the routes that should be served from
   * Lambda functions.
   */
  LambdaRoutes: string;
  /**
   * Stringified object that contains the routes that are prerendered.
   */
  Prerenders: string;
  /**
   * Id of the associated deployment
   */
  DeploymentId: string;
  /**
   * Wether or not the alias is associated (fixed) with a deployment.
   */
  DeploymentAlias: boolean;
};
