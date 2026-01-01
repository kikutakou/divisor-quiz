terraform {
  required_version = ">= 1.0.0"

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

resource "google_dns_record_set" "subdomain_cname" {
  name         = "${var.subdomain}.${var.domain}."
  managed_zone = var.zone_name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["${var.github_pages_domain}."]
}

output "cname_record" {
  description = "作成されたCNAMEレコード"
  value       = google_dns_record_set.subdomain_cname.name
}

output "cname_target" {
  description = "CNAMEレコードのターゲット"
  value       = google_dns_record_set.subdomain_cname.rrdatas[0]
}
