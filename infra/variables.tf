variable "project_id" {
  description = "Google Cloud プロジェクトID"
  type        = string
}

variable "region" {
  description = "Google Cloud リージョン"
  type        = string
  default     = "asia-northeast1"
}

variable "domain" {
  description = "親ドメイン名（例: example.com）"
  type        = string
}

variable "zone_name" {
  description = "Cloud DNSのマネージドゾーン名"
  type        = string
}

variable "subdomain" {
  description = "サブドメイン名（例: www）"
  type        = string
}

variable "github_pages_domain" {
  description = "GitHub PagesのドメインURL"
  type        = string
  default     = "your-username.github.io"
}
