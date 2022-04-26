const { DynamoDB } = require('aws-sdk');

const { getAliasById } = require('./dist');

const client = new DynamoDB({
  region: 'eu-central-1',
});

async function main() {
  const result = await getAliasById({
    dynamoDBClient: client,
    aliasId: '8a2f60712ab269874399a50a4ced3321.multid.milli.is',
    aliasTableName: 'mutli-deployment-test_aliases',
    attributes: {
      Routes: true,
      Prerenders: true,
      StaticRoutes: true,
    },
  });

  console.log(result);
}

main();
