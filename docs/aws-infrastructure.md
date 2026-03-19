# Civitro — AWS Infrastructure

## Account

| Field | Value |
|-------|-------|
| Account Name | Civitro-Dev |
| Account ID | 431056843628 |
| Email | pratik+civitro-dev@bloomiya.ai |
| Organization | o-2fl5x1z5an (Bloom AI) |
| OU | Products (ou-9g9m-sxi9w638) |
| Region | ap-south-1 (Mumbai) |

## Organization Structure

```
Root (r-9g9m) — Bloom AI (371580379428)
├── Security OU
│   ├── Log-Archive       (714412037468)
│   └── Security-Tooling  (272558305028)
├── Shared-Services OU    (empty)
├── Products OU
│   ├── BloomAI-Research          (544471417766)
│   ├── University-Prod           (756041605302)
│   ├── Bloomiya-University-Prod  (805778285547)
│   └── Civitro-Dev               (431056843628)  ← NEW
├── Data OU               (empty)
└── Sandbox OU
    └── Sandbox           (716333887131)
```

## EC2 Instance

| Field | Value |
|-------|-------|
| Instance ID | i-0abdc39a620517888 |
| Type | t3.medium (2 vCPU, 4GB RAM) |
| AMI | Ubuntu 22.04 LTS (ami-07216ac99dc46a187) |
| Disk | 50 GB gp3 (encrypted) |
| Elastic IP | 13.200.159.10 |
| Key Pair | civitro-dev (ed25519) |
| SSH Key Location | ~/.ssh/civitro-dev |
| Security Group | sg-03f2f9909754f5915 |
| IAM Role | civitro-dev-ec2 |
| Instance Profile | civitro-dev-profile |

## Security Group Rules

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 8080 | TCP | 0.0.0.0/0 | API Gateway (nginx) |

## DNS (Route 53)

| Record | Type | Value |
|--------|------|-------|
| civitro.com | A | 13.200.159.10 |
| api.civitro.com | A | 13.200.159.10 |
| www.civitro.com | CNAME | civitro.com |

**Hosted Zone ID:** Z008276888ZG78UV8QS4

**Nameservers (set in GoDaddy):**
```
ns-238.awsdns-29.com
ns-922.awsdns-51.net
ns-1893.awsdns-44.co.uk
ns-1286.awsdns-32.org
```

## S3

| Bucket | Purpose |
|--------|---------|
| civitro-dev-media | Photo/media uploads |

Public access: BLOCKED. Encryption: AES-256.

## SSH Access

```bash
ssh -i ~/.ssh/civitro-dev ubuntu@13.200.159.10
```

## Deploy

```bash
# SSH into server
ssh -i ~/.ssh/civitro-dev ubuntu@13.200.159.10

# First time
/opt/civitro/first-deploy.sh

# Subsequent deploys
/opt/civitro/deploy.sh

# SSL setup (after DNS propagates)
/opt/civitro/setup-ssl.sh
```

## Server Scripts (on EC2, created by setup-server.sh)

| Script | Purpose |
|--------|---------|
| /opt/civitro/.env | Environment variables (DB password, JWT secret) |
| /opt/civitro/first-deploy.sh | Clone repo + initial deploy |
| /opt/civitro/deploy.sh | Pull + rebuild + restart |
| /opt/civitro/setup-ssl.sh | Let's Encrypt SSL for civitro.com |

## Estimated Cost

| Service | Monthly |
|---------|---------|
| EC2 t3.medium | ~$30 |
| EBS 50GB gp3 | ~$4 |
| Elastic IP | ~$4 |
| S3 (media) | ~$1 |
| Route 53 | ~$0.50 |
| **Total** | **~$40/mo** |

## Upgrade Path

| Users | Action |
|-------|--------|
| 1K testers | Current setup (t3.medium) |
| 10K users | Upgrade to t3.xlarge, separate RDS |
| 50K+ | ECS Fargate + Aurora Serverless |
| 1M+ | Full managed AWS stack |

## Future: Civitro-Prod

When ready for real users, create a separate account:
```bash
aws organizations create-account --email pratik+civitro@bloomiya.ai --account-name Civitro-Prod
```
Same infrastructure, different account. Testers never see prod, prod never sees dev.
