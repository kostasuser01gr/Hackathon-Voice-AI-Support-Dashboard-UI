variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "europe-west1"
}

variable "service_name" {
  type    = string
  default = "voice-to-action-agent"
}

variable "image" {
  type = string
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
}
