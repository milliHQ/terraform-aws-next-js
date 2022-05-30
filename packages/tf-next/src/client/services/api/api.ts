import { URL, URLSearchParams } from 'url';

import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HeaderBag, MemoizedProvider } from '@aws-sdk/types';
import { paths } from '@millihq/terraform-next-api/schema';
import { Credentials } from 'aws-lambda';
import nodeFetch, { HeadersInit } from 'node-fetch';

type NodeFetch = typeof nodeFetch;
type CreateAliasRequestBody =
  paths['/aliases']['post']['requestBody']['content']['application/json'];
type CreateAliasSuccessResponse =
  paths['/aliases']['post']['responses']['201']['content']['application/json'];
type ListAliasQueryParameters = paths['/aliases']['get']['parameters']['query'];
type ListAliasSuccessResponse =
  paths['/aliases']['get']['responses']['200']['content']['application/json'];
type CreateDeploymentSuccessResponse =
  paths['/deployments']['post']['responses']['201']['content']['application/json'];
type ListDeploymentsSuccessResponse =
  paths['/deployments']['get']['responses']['200']['content']['application/json'];
type GetDeploymentByIdSuccessResponse =
  paths['/deployments/{deploymentId}']['get']['responses']['200']['content']['application/json'];

/**
 * API Gateway endpoints use a regional API endpoint which includes the AWS
 * region where they are deployed to.
 * e.g. https://xyz.execute-api.eu-central-1.amazonaws.com
 */
function extractRegionFromApiGatewayEndpoint(
  endpointUrl: string
): string | null {
  const result = endpointUrl.match(/execute-api\.([^\.]*)/);

  if (result && result[1]) {
    return result[1];
  }

  return null;
}

/**
 * Converts the headers from fetch into SignatureV4 compatible format.
 */
function convertFetchHeaders(
  inputHeaders: HeadersInit | undefined = {}
): HeaderBag {
  const result: HeaderBag = {};

  for (const [key, value] of Object.entries(inputHeaders)) {
    result[key] = value;
  }

  return result;
}

/* -----------------------------------------------------------------------------
 * ApiService
 * ---------------------------------------------------------------------------*/

type ApiServiceOptions = {
  apiEndpoint: string;
  awsCredentialProvider: MemoizedProvider<Credentials>;
};

class ApiService {
  apiEndpoint: string;
  awsCredentialProvider: MemoizedProvider<Credentials>;
  awsRegion: string;

  constructor({ apiEndpoint, awsCredentialProvider }: ApiServiceOptions) {
    this.apiEndpoint = apiEndpoint;
    this.awsCredentialProvider = awsCredentialProvider;

    const awsRegion = extractRegionFromApiGatewayEndpoint(apiEndpoint);
    if (!awsRegion) {
      throw new Error(
        'API endpoint is in bad format. Could not extract region from it.'
      );
    }
    this.awsRegion = awsRegion;
  }

  /**
   * Fetch that signs a request with SignatureV4 automatically.
   * @param fetchArgs
   * @returns
   */
  private async fetchAWSSigV4(...fetchArgs: Parameters<NodeFetch>) {
    const signature = new SignatureV4({
      region: this.awsRegion,
      service: 'execute-api',
      credentials: this.awsCredentialProvider,
      sha256: Sha256,
    });

    let requestUrl: string;
    if (typeof fetchArgs[0] === 'string') {
      requestUrl = fetchArgs[0];
    } else if ('href' in fetchArgs[0]) {
      requestUrl = fetchArgs[0].href;
    } else {
      requestUrl = fetchArgs[0].url;
    }

    const parsedUrl = new URL(requestUrl, this.apiEndpoint);
    const signedRequest = await signature.sign({
      hostname: parsedUrl.hostname,
      protocol: parsedUrl.protocol,
      path: parsedUrl.pathname,
      headers: convertFetchHeaders({
        ...fetchArgs[1]?.headers,
        host: parsedUrl.hostname,
        accept: 'application/json',
      }),
      method: fetchArgs[1]?.method?.toUpperCase() ?? 'GET',
    });
    return nodeFetch(parsedUrl.href, {
      ...fetchArgs[1],
      headers: signedRequest.headers,
    });
  }

  // Aliases
  async createAlias(requestBody: CreateAliasRequestBody) {
    const response = await this.fetchAWSSigV4('/aliases', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 201) {
      return await (response.json() as Promise<CreateAliasSuccessResponse>);
    }
  }

  async deleteAlias(alias: string) {
    const response = await this.fetchAWSSigV4(`/aliases/${alias}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
      return true;
    }

    return null;
  }

  async listAliases(deploymentId: string) {
    const params: ListAliasQueryParameters = {
      deploymentId,
    };
    const query = new URLSearchParams(params).toString();
    const response = await this.fetchAWSSigV4(`/aliases?${query}`);

    if (response.status === 200) {
      const { items } =
        await (response.json() as Promise<ListAliasSuccessResponse>);
      return items;
    }

    return null;
  }

  // Deployments
  async createDeployment() {
    const response = await this.fetchAWSSigV4('/deployments', {
      method: 'POST',
    });

    if (response.status === 201) {
      return response.json() as Promise<CreateDeploymentSuccessResponse>;
    }

    return null;
  }

  async listDeployments() {
    const response = await this.fetchAWSSigV4('/deployments');

    if (response.status === 200) {
      const { items } =
        await (response.json() as Promise<ListDeploymentsSuccessResponse>);
      return items;
    }

    return null;
  }

  async getDeploymentById(deploymentId: string) {
    const response = await this.fetchAWSSigV4(`/deployments/${deploymentId}`);

    if (response.status === 200) {
      return response.json() as Promise<GetDeploymentByIdSuccessResponse>;
    }

    return null;
  }

  async deleteDeploymentById(deploymentId: string) {
    const response = await this.fetchAWSSigV4(`/deployments/${deploymentId}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
      return true;
    }

    return null;
  }
}

export { ApiService };
