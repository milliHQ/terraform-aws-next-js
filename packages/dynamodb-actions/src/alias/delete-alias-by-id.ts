import DynamoDB from 'aws-sdk/clients/dynamodb';

import { getAliasById } from './get-alias-by-id';

type DeleteAliasByIdOptions = {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
  /**
   * The id of the alias that should be deleted.
   */
  hostnameRev: string;
  /**
   * The basePath of the alias that should be deleted.
   */
  basePath: string;
};

async function deleteAliasById(options: DeleteAliasByIdOptions) {
  const { dynamoDBClient, aliasTableName } = options;
  // Cannot delete by query, so we have to receive the item first
  const aliasToDelete = await getAliasById(options);

  if (!aliasToDelete) {
    throw new Error('Alias does not exist.');
  }

  await dynamoDBClient
    .deleteItem({
      TableName: aliasTableName,
      Key: {
        PK: {
          S: aliasToDelete.PK,
        },
        SK: {
          S: aliasToDelete.SK,
        },
      },
    })
    .promise();
}

export { deleteAliasById };
