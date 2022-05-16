/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/deployments/{deploymentId}': {
    get: {
      responses: {
        /** Successful response. */
        200: {
          content: {
            'application/json': components['schemas']['Deployment'];
          };
        };
      };
    };
  };
  '/deployments': {
    post: {
      responses: {
        /** Successful response. */
        200: {
          content: {
            'application/json': components['schemas']['DeploymentInitialized'];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    /** @enum {string} */
    DeploymentStatus: 'INITIALIZED' | 'CREATE_COMPLETE' | 'CREATE_FAILED';
    DeploymentInitialized: {
      id: string;
      status: components['schemas']['DeploymentStatus'];
      uploadUrl: string;
    };
    Deployment: {
      id: string;
      status: components['schemas']['DeploymentStatus'];
    };
  };
}

export interface operations {}

export interface external {}
