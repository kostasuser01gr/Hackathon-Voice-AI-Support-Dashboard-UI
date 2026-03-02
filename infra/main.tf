terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_cloud_run_v2_service" "voice_to_action_agent" {
  name     = var.service_name
  location = var.region

  template {
    containers {
      image = var.image
      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }
      env {
        name  = "HISTORY_MODE"
        value = "local"
      }
      env {
        name  = "RATE_LIMIT_PER_MIN"
        value = "20"
      }
      env {
        name  = "MAX_INPUT_CHARS"
        value = "2000"
      }
    }
  }
}

resource "google_cloud_run_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.voice_to_action_agent.location
  project  = google_cloud_run_v2_service.voice_to_action_agent.project
  service  = google_cloud_run_v2_service.voice_to_action_agent.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.voice_to_action_agent.uri
}
