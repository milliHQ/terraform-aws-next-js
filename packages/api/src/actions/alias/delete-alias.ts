import {
  deleteAliasById,
  getAliasById,
  reverseHostname,
} from '@millihq/tfn-dynamodb-actions';
import { validate } from 'class-validator';
import { Request, Response } from 'lambda-api';

import { DynamoDBServiceType } from '../../services/dynamodb';

class DeleteAliasPayload {
  /**
   * The custom domain (or alias) that should be removed.
   */
  customDomain: string;
}

async function deleteAlias(req: Request, res: Response) {
  const payload = new DeleteAliasPayload();
  payload.customDomain = req.body.customDomain;

  const payloadErrors = await validate(payload);
  if (payloadErrors.length > 0) {
    return res.error(400, 'Payload validation', payloadErrors);
  }

  const dynamoDB = req.namespace.dynamoDB as DynamoDBServiceType;
  const aliasToDelete = reverseHostname(payload.customDomain);

  // Check if the alias is protected (deployment alias)
  const dbAlias = await getAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: aliasToDelete,
    attributes: {
      DeploymentAlias: true,
    },
  });

  if (!dbAlias || dbAlias.DeploymentAlias === true) {
    return res.error(400, 'Cannot delete alias');
  }

  await deleteAliasById({
    dynamoDBClient: dynamoDB.getDynamoDBClient(),
    aliasTableName: dynamoDB.getAliasTableName(),
    hostnameRev: aliasToDelete,
    basePath: '/',
  });

  res.send({
    status: 200,
  });
}

export { deleteAlias };
