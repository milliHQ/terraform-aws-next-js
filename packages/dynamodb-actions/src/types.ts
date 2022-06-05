/**
 * CDK Template that is used for a deployment.
 */
export type DeploymentTemplateType = 'FUNCTION_URLS' | 'API_GATEWAY';

export type DeploymentItem = {
  /* ------------------------------- Keys ----------------------------------- */

  /**
   * Partition Key: DEPLOYMENTS
   */
  PK: 'DEPLOYMENTS';
  /**
   * Sort Key: D#<deploymentId>
   */
  SK: string;
  /**
   * Sort key for the CreateDateIndex: <CreateDate>#D#<DeploymentId>
   */
  GSI1SK: string;

  /* ---------------------------- Attributes -------------------------------- */

  /**
   * Unique id of the deployment.
   */
  DeploymentId: string;
  /**
   * Timestamp when the deployment was created. Format is ISO 8601.
   */
  CreateDate: string;
  /**
   * Status of the deployment
   */
  Status:
    | 'INITIALIZED'
    | 'CREATE_IN_PROGRESS'
    | 'CREATE_COMPLETE'
    | 'CREATE_FAILED'
    | 'FINISHED'
    | 'DESTROY_IN_PROGRESS'
    | 'DESTROY_FAILED'
    | 'DESTROY_REQUESTED';
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
  /**
   * The CDK template that is used for the deployment.
   */
  DeploymentTemplate: DeploymentTemplateType;
  /**
   * The CloudFormation stack that are associated with this deployment.
   */
  CFStack?: string;
};

export type DeploymentItemCreateDateIndex = Pick<
  DeploymentItem,
  'DeploymentId' | 'CreateDate' | 'Status' | 'DeploymentAlias'
>;

export type RouteItem = {
  /* ------------------------------- Keys ----------------------------------- */

  /**
   * Partition Key: DEPLOYMENTS
   */
  PK: 'ROUTES';
  /**
   * Sort Key: <HostnameRev>#<BasePath>
   */
  SK: string;
  /**
   * Partition Key for DeploymentIdIndex: D#<DeploymentId>
   */
  GSI1PK: string;
  /**
   * Sort Key for DeploymentIdIndex: <CreateDate>#R#<HostnameRev>#<BasePath>
   */
  GSI1SK: string;

  /* ---------------------------- Attributes -------------------------------- */

  /**
   * Version of the item
   */
  ItemVersion: number;
  /**
   * Timestamp when the deployment was created. Format is ISO 8601.
   */
  CreateDate: string;
  /**
   * The hostname where the alias belongs to in reversed form.
   * e.g. com.example.sub
   */
  HostnameRev: string;
  /**
   * The basePath of the alias.
   */
  BasePath: string;
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

export type RouteItemDeploymentIdIndex = Pick<
  RouteItem,
  | 'PK'
  | 'SK'
  | 'GSI1PK'
  | 'GSI1SK'
  | 'BasePath'
  | 'CreateDate'
  | 'DeploymentAlias'
  | 'DeploymentId'
  | 'HostnameRev'
>;

export type PaginatedQuery<Item> = {
  /**
   * The next key that should be used when
   */
  nextKey: string | null;
  hasNext: boolean;
  items: Item[];
};
