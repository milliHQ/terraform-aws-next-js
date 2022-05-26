import { reverseHostname } from '@millihq/tfn-dynamodb-actions';
import Validator from 'validator';

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

/**
 * Options that can be passed into the isUrl() validator to check the hostname
 * of an alias for correctness.
 */
const hostnameValidationOptions: Validator.IsURLOptions = {
  require_host: true,
  allow_query_components: false,
  require_valid_protocol: true,
  protocols: [],
  disallow_auth: true,
};

export { generateAliasId, hostnameValidationOptions };
