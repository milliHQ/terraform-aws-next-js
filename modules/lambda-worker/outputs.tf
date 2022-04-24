output "lambda_function_arn" {
  description = "The ARN of the Lambda Function."
  value       = aws_lambda_function.this.arn
}
