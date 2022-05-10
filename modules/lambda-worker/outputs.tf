# This module is based on the terraform-aws-lambda module:
# https://github.com/terraform-aws-modules/terraform-aws-lambda
#
# See the LICENSE file in the directory of this module for more information.
#
# It simplifies the available options for configuration to match the needs of
# this project.

output "lambda_function_arn" {
  description = "The ARN of the Lambda Function."
  value       = aws_lambda_function.this.arn
}

output "lambda_function_invoke_arn" {
  description = "ARN to be used for invoking Lambda Function from API Gateway."
  value       = aws_lambda_function.this.invoke_arn
}
