import * as fs from 'fs';
import * as path from 'path';
import { URLSearchParams } from 'url';
import { dirSync as tmpDir } from 'tmp';
import { stringify as yaml } from 'yaml';
import getPort from 'get-port';
import { Lambda as AWSLambda } from 'aws-sdk';
import fetch, { Response } from 'node-fetch';

import {
  createPayload,
  randomServerlessFunctionName,
  unzipToLocation,
} from './utils';
import { createSAMLocal, SAMLocal } from './SAMLocal';
import { APIGatewayProxyResult } from 'aws-lambda';
import { SAMTemplate } from './types';

/**
 * Wrapper that generates a serverless application model (SAM) for lambda inputs
 * https://github.com/aws/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction
 */

interface ConfigLambda {
  handler: string;
  runtime: string;
  filename: string;
  route: string;
}

interface SendRequestPayload {
  functionName: string;
  path: string;
  headers?: Record<string, string>;
  searchParams?: URLSearchParams;
}

interface SendRequestResponse {
  headers: { [key: string]: string };
  body: string;
  statusCode: number;
}

export interface SAM {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendRequest(payload: SendRequestPayload): Promise<SendRequestResponse>;
  sendApiGwRequest(
    path: string,
    options?: { headers?: Record<string, string> }
  ): Promise<Response>;
  mapping: Map<string, string>;
}

interface Props {
  lambdas: Record<string, ConfigLambda>;
  cwd: string;
}

export async function generateSAM({ lambdas, cwd }: Props): Promise<SAM> {
  const _tmpDir = tmpDir({ unsafeCleanup: true });
  const workdir = _tmpDir.name;
  const mapping = new Map<string, string>();

  // Generate the SAM yml
  const SAMTemplate: SAMTemplate = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: ['AWS::Serverless-2016-10-31'],
    Resources: {},
    Outputs: {
      WebEndpoint: {
        Value:
          "!Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/'",
      },
    },
  };

  // Unpack all lambdas
  for (const [key, lambda] of Object.entries(lambdas)) {
    const functionName = randomServerlessFunctionName();
    mapping.set(`/${key}`, functionName);
    await unzipToLocation(
      path.join(cwd, lambda.filename),
      path.join(workdir, functionName)
    );
    SAMTemplate.Resources[functionName] = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        Handler: `${functionName}/${lambda.handler}`,
        Description: key,
        Runtime: 'nodejs12.x',
        MemorySize: 512,
        Timeout: 29, // Max timeout from API Gateway
        Events: {
          Api: {
            Type: 'HttpApi',
            Properties: {
              Path: `${lambda.route}/{proxy+}`,
              Method: 'any',
              TimeoutInMillis: 29000, // Max timeout
              PayloadFormatVersion: '2.0',
            },
          },
        },
      },
    };
  }

  // Write the SAM template
  fs.writeFileSync(path.join(workdir, 'template.yml'), yaml(SAMTemplate));

  let SAM: SAMLocal;
  let port: number;
  let client: AWSLambda;

  async function start() {
    // Get free port
    port = await getPort();
    SAM = await createSAMLocal('api', workdir, port);
    client = new AWSLambda({
      endpoint: `http://localhost:${port}`,
      region: 'local',
    });
  }

  async function stop() {
    await SAM.kill();
    _tmpDir.removeCallback();
  }

  function sendRequest(
    payload: SendRequestPayload
  ): Promise<SendRequestResponse> {
    const eventPayload = createPayload({
      headers: payload.headers || {},
      httpMethod: 'GET',
      path: payload.path,
      searchParams: payload.searchParams,
    });

    return client
      .invoke({
        FunctionName: payload.functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(eventPayload),
      })
      .promise()
      .then((response) => {
        // Try to unpack the response
        const _payload = JSON.parse(
          response.Payload!.toString()
        ) as APIGatewayProxyResult;

        if (_payload.isBase64Encoded) {
          // Decode an base64 response first
          return {
            body: Buffer.from(_payload.body, 'base64').toString('utf-8'),
            headers: {},
            statusCode: _payload.statusCode,
          };
        }

        return {
          body: _payload.body,
          headers: {},
          statusCode: _payload.statusCode,
        };
      });
  }

  const sendApiGwRequest: SAM['sendApiGwRequest'] = async (
    path: string,
    { headers } = {}
  ) => {
    return fetch(`http://localhost:${port}${path}`, { headers });
  };

  return {
    start,
    stop,
    sendRequest,
    sendApiGwRequest,
    mapping,
  };
}
