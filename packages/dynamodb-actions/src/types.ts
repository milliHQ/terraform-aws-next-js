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
  Status: 'CREATE_IN_PROGRESS' | 'CREATE_COMPLETE' | 'CREATE_FAILED';
  /**
   * Version of the item
   */
  ItemVersion: number;
};
