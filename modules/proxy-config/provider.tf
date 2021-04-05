# Proxy AWS provider for Lambda@Edge
# TODO: We only use the proxy provider here for better upgradibility
# from 0.7.x -> 0.8.x
# Should be removed with the release of 0.9.x
provider "aws" {
  alias = "global_region"
}
