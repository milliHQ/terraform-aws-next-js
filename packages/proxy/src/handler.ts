import { CloudFrontRequestHandler } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;

  return request;
};
