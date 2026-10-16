terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# --- DynamoDB Tables ---

resource "aws_dynamodb_table" "contacts" {
  name         = "ires_crm_contacts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "brand"
    type = "S"
  }

  attribute {
    name = "stage"
    type = "S"
  }

  global_secondary_index {
    name            = "BrandStageIndex"
    hash_key        = "brand"
    range_key       = "stage"
    projection_type = "ALL"
  }

  tags = {
    Environment = "production"
    Application = "ires-crm"
  }
}

resource "aws_dynamodb_table" "quotes" {
  name         = "ires_crm_quotes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "contactId"
    type = "S"
  }

  global_secondary_index {
    name            = "ContactIdIndex"
    hash_key        = "contactId"
    projection_type = "ALL"
  }

  tags = {
    Environment = "production"
    Application = "ires-crm"
  }
}

resource "aws_dynamodb_table" "questionnaires" {
  name         = "ires_crm_questionnaires"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = "production"
    Application = "ires-crm"
  }
}

# --- S3 Storage Bucket for Frontend & Assets ---

resource "aws_s3_bucket" "frontend" {
  bucket        = "crm.iresglobal.com"
  force_destroy = true

  tags = {
    Application = "ires-crm"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_public" {
  depends_on = [aws_s3_bucket_public_access_block.frontend]
  bucket     = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# Bucket for Quotes, Attachments & Floorplans
resource "aws_s3_bucket" "attachments" {
  bucket        = "ires-crm-attachments-${random_string.suffix.result}"
  force_destroy = true

  tags = {
    Application = "ires-crm"
  }
}

resource "aws_s3_bucket_cors_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}
