########
# Bucket
########

resource "aws_s3_bucket" "lambda_storage" {
  bucket_prefix = "next-tf-deploy-source"
  acl           = "private"
}

########
# Lambda
########

module "deploy_trigger" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "my-lambda1"
  handler       = "index.lambda_handler"
  runtime       = "python3.8"

  source_path = "../src/lambda-function1"
}
