import * as AWS from 'aws-sdk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigOutput } from '../types';

interface Props {
  Bucket: string;
}

async function main(props: Props) {
  // Initialize credentials
  var credentials = new AWS.SharedIniFileCredentials({
    profile: 'default',
  });
  AWS.config.credentials = credentials;
  const s3 = new AWS.S3();

  try {
    const configDir = path.join(process.cwd(), '.next-tf');
    const config = (await fs.readJSON(
      path.join(configDir, 'config.json')
    )) as ConfigOutput;

    console.log('Uploading ', config.staticFilesArchive, '...');
    // Read static files archive & upload it to S3
    const staticFileArchive = fs.createReadStream(
      path.join(configDir, config.staticFilesArchive)
    );
    const params: AWS.S3.Types.PutObjectRequest = {
      Bucket: props.Bucket,
      Key: config.staticFilesArchive,
      Body: staticFileArchive,
    };

    await s3.upload(params).promise();

    console.log('done.');
  } catch (err) {
    console.error(err);
  }
}

export default main;
