import DynamoDB from 'aws-sdk/clients/dynamodb';

const { marshall, unmarshall } = DynamoDB.Converter;

type UpdateItemOptions = {
  /**
   * DynamoDB instance.
   */
  client: DynamoDB;
  /**
   * Name of the target table.
   */
  tableName: string;
  /**
   * Key of the target item.
   */
  key: Record<string, any>;

  /**
   * Updates for target item.
   */
  item: Record<string, any>;
};

/**
 * Helper to make simple updates to an item in DynamoDB.
 * @see {@link https://stackoverflow.com/a/66036730/831465}
 *
 * @param options
 */
async function updateItem({ client, tableName, key, item }: UpdateItemOptions) {
  // Filter out keys that have undefined values
  const itemKeys = Object.keys(item).filter((key) => item[key] !== undefined);

  // When we do updates we need to tell DynamoDB what fields we want updated.
  // If that's not annoying enough, we also need to be careful as some field names
  // are reserved - so DynamoDB won't like them in the UpdateExpressions list.
  // To avoid passing reserved words we prefix each field with "#field" and provide the correct
  // field mapping in ExpressionAttributeNames. The same has to be done with the actual
  // value as well. They are prefixed with ":value" and mapped in ExpressionAttributeValues
  // along with their actual value
  const { Attributes } = await client
    .updateItem({
      TableName: tableName,
      Key: marshall(key),
      ReturnValues: 'ALL_NEW',
      UpdateExpression: `SET ${itemKeys
        .map((_, index) => `#field${index} = :value${index}`)
        .join(', ')}`,
      ExpressionAttributeNames: itemKeys.reduce(
        (accumulator, k, index) => ({ ...accumulator, [`#field${index}`]: k }),
        {}
      ),
      ExpressionAttributeValues: marshall(
        itemKeys.reduce(
          (accumulator, k, index) => ({
            ...accumulator,
            [`:value${index}`]: item[k],
          }),
          {}
        )
      ),
    })
    .promise();

  if (!Attributes) {
    throw new Error('No Attributes returned after updating.');
  }

  return unmarshall(Attributes);
}

export { updateItem };
