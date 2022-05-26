import { reverseHostname } from '@millihq/tfn-dynamodb-actions';

type LikeRouteItem = {
  HostnameRev: string;
  BasePath: string;
};

/**
 * Generates a id from the alias object that can be returned from the REST API.
 * @param routeItem
 * @returns
 */
function generateAliasId<T extends LikeRouteItem>(routeItem: T) {
  return reverseHostname(routeItem.HostnameRev) + routeItem.BasePath;
}

export { generateAliasId };
