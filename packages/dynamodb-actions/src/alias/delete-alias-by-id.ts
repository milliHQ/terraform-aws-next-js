import DynamoDB from 'aws-sdk/clients/dynamodb';

import { getAliasById } from './get-alias-by-id';

interface DeleteAliasByIdBaseOptions {
  /**
   * DynamoDB client
   */
  dynamoDBClient: DynamoDB;
  /**
   * Name of the table that holds the aliases.
   */
  aliasTableName: string;
}

/**
 * Options to delete an alias by providing hostname & basePath.
 */
interface DeleteAliasByIdHostnameOptions extends DeleteAliasByIdBaseOptions {
  /**
   * The id of the alias that should be deleted.
   */
  hostnameRev: string;
  /**
   * The basePath of the alias that should be deleted.
   */
  basePath: string;
}

/**
 * Options to delete an alias by providing the SortKey (SK)
 */
interface DeleteAliasByIdKeyOptions extends DeleteAliasByIdBaseOptions {
  /**
   * The sort key (SK) of the alias that should be deleted.
   */
  SK: string;
}

type DeleteAliasByIdOptions =
  | DeleteAliasByIdHostnameOptions
  | DeleteAliasByIdKeyOptions;

async function deleteAliasById(options: DeleteAliasByIdOptions) {
  const { dynamoDBClient, aliasTableName } = options;
  let SK: string;

  if (!('SK' in options)) {
    // Cannot delete by query, so we have to receive the item first
    const aliasToDelete = await getAliasById(options);

    if (!aliasToDelete) {
      throw new Error('Alias does not exist.');
    }

    SK = aliasToDelete.SK;
  } else {
    SK = options.SK;
  }

  await dynamoDBClient
    .deleteItem({
      TableName: aliasTableName,
      Key: {
        PK: {
          S: 'ROUTES',
        },
        SK: {
          S: SK,
        },
      },
    })
    .promise();
}

export { deleteAliasById };
