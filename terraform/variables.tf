variable "aws_region" {
  type        = string
  default     = "eu-west-1"
  description = "AWS Region to deploy CRM resources"
}

variable "aws_profile" {
  type        = string
  default     = "william_tribedart"
  description = "AWS CLI Profile to use"
}
