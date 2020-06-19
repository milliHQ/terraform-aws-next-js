import { S3Handler } from 'aws-lambda';

// Based on the example from this blog post:
// https://aws.amazon.com/blogs/devops/automatically-deploy-from-amazon-s3-using-aws-codedeploy/
export const handler: S3Handler = async (event, context) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;


  const pagesDir = path.join(
    entryPath,
    outputDirectory,
    'serverless',
    'pages'
  );

  const pages = await glob('**/*.js', pagesDir);
  const staticPageFiles = await glob('**/*.html', pagesDir);

}