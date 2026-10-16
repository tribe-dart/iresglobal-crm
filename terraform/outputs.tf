output "contacts_table_name" {
  value = aws_dynamodb_table.contacts.name
}

output "quotes_table_name" {
  value = aws_dynamodb_table.quotes.name
}

output "questionnaires_table_name" {
  value = aws_dynamodb_table.questionnaires.name
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "frontend_website_endpoint" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "attachments_bucket_name" {
  value = aws_s3_bucket.attachments.id
}
