output "sns_topic_arn" {
  value = aws_sns_topic.cloudformation_updates.arn
}
