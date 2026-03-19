# ════════════════════════════════════════════════════════════════
# Civitro — Single EC2 Deployment (1000 testers)
# Region: ap-south-1 (Mumbai)
# ════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after first apply to store state remotely
  # backend "s3" {
  #   bucket = "civitro-dev-terraform-state"
  #   key    = "infra/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "civitro"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ────────────────────────────────────────
# DATA SOURCES
# ────────────────────────────────────────

# Latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ────────────────────────────────────────
# VPC — Use default VPC for simplicity
# ────────────────────────────────────────

data "aws_vpc" "default" {
  default = true
}

# ────────────────────────────────────────
# SECURITY GROUP
# ────────────────────────────────────────

resource "aws_security_group" "civitro" {
  name        = "civitro-${var.environment}"
  description = "Civitro ${var.environment} server"
  vpc_id      = data.aws_vpc.default.id

  # SSH (restrict to your IP in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # API Gateway (nginx)
  ingress {
    description = "API Gateway"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "civitro-${var.environment}-sg"
  }
}

# ────────────────────────────────────────
# SSH KEY PAIR
# ────────────────────────────────────────

resource "aws_key_pair" "civitro" {
  key_name   = "civitro-${var.environment}"
  public_key = var.ssh_public_key
}

# ────────────────────────────────────────
# EC2 INSTANCE
# ────────────────────────────────────────

resource "aws_instance" "civitro" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.civitro.key_name
  vpc_security_group_ids = [aws_security_group.civitro.id]

  root_block_device {
    volume_size           = var.disk_size_gb
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    delete_on_termination = true
    encrypted             = true
  }

  # Install Docker + Docker Compose on boot
  user_data = file("${path.module}/scripts/setup-server.sh")

  # IAM role for S3 access
  iam_instance_profile = aws_iam_instance_profile.civitro.name

  tags = {
    Name = "civitro-${var.environment}"
  }
}

# ────────────────────────────────────────
# ELASTIC IP (static public IP)
# ────────────────────────────────────────

resource "aws_eip" "civitro" {
  instance = aws_instance.civitro.id
  domain   = "vpc"

  tags = {
    Name = "civitro-${var.environment}-eip"
  }
}

# ────────────────────────────────────────
# IAM ROLE — EC2 access to S3
# ────────────────────────────────────────

resource "aws_iam_role" "civitro_ec2" {
  name = "civitro-${var.environment}-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "civitro_s3" {
  name = "civitro-${var.environment}-s3"
  role = aws_iam_role.civitro_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "civitro" {
  name = "civitro-${var.environment}-profile"
  role = aws_iam_role.civitro_ec2.name
}

# ────────────────────────────────────────
# S3 BUCKET — Media uploads
# ────────────────────────────────────────

resource "aws_s3_bucket" "media" {
  bucket = "civitro-${var.environment}-media"

  tags = {
    Name = "civitro-${var.environment}-media"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ────────────────────────────────────────
# S3 BUCKET — Terraform state (optional)
# ────────────────────────────────────────

resource "aws_s3_bucket" "terraform_state" {
  bucket = "civitro-${var.environment}-terraform-state"

  tags = {
    Name = "civitro-${var.environment}-terraform-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
