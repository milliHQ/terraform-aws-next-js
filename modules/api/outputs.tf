output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "api_endpoint_access_policy_arn" {
  value = aws_iam_policy.access_api.arn
}
