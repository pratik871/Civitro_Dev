output "public_ip" {
  description = "Elastic IP address of the Civitro server"
  value       = aws_eip.civitro.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.civitro.id
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i civitro-dev.pem ubuntu@${aws_eip.civitro.public_ip}"
}

output "api_url" {
  description = "API gateway URL"
  value       = "http://${aws_eip.civitro.public_ip}:8080"
}

output "media_bucket" {
  description = "S3 bucket for media uploads"
  value       = aws_s3_bucket.media.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.civitro.id
}
