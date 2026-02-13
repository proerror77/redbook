# AWS Multi-Region Proxy Infrastructure

Multi-region proxy node system with decoupled base profile and dynamic node lists.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Config Plane   │     │ Subscription API │     │   Data Plane    │
│                 │     │                  │     │                 │
│  S3 + CloudFront│     │ Lambda + API GW  │     │  EC2 + sing-box │
│  (base.yaml +   │     │ + DynamoDB       │     │  (3 regions)    │
│   rules)        │     │ (token → nodes)  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

- **Config Plane**: S3 bucket behind CloudFront OAC serves the base profile and rule files
- **Subscription Plane**: Lambda generates per-token proxy-provider YAML from DynamoDB
- **Data Plane**: EC2 instances running sing-box with 4 protocols per node

## Prerequisites

- AWS CLI v2 configured with appropriate permissions
- `jq` for JSON processing
- `uuidgen` for token generation
- `openssl` for credential generation

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your AWS profile, budget email, etc.

# 2. Download rule sets (placeholders included, full sets recommended)
cd rules/
curl -L -o geosite-cn.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt
curl -L -o geosite-category-ads.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt
curl -L -o geoip-cn.yaml https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt
cd ..

# 3. Run deployment phases in order
bash scripts/phase-a-foundation.sh   # IAM, Budget, Secrets
bash scripts/phase-b-network.sh      # VPC, SG (3 regions)
bash scripts/phase-c-config-plane.sh # S3, CloudFront
bash scripts/phase-d-subscription.sh # DynamoDB, Lambda, API GW
bash scripts/phase-e-data-plane.sh   # EC2 instances (3 regions)
bash scripts/phase-f-bootstrap.sh    # Install sing-box via SSM
bash scripts/phase-g-verify.sh       # End-to-end verification
```

## Operational Commands

```bash
# Add a new user token
bash scripts/add-token.sh <user_name> [region1,region2,...]

# Add a node to DynamoDB
bash scripts/add-node.sh <node_id> <region> <public_ip> <instance_id>

# Rotate all credentials and re-bootstrap nodes
bash scripts/rotate-credentials.sh

# Destroy all resources (with confirmation)
bash scripts/teardown.sh
```

## Protocols & Ports

| Protocol | Port | Transport |
|----------|------|-----------|
| Shadowsocks AEAD | 8388 | TCP+UDP |
| VLESS + Reality | 443 | TCP |
| Trojan | 8443 | TCP |
| Hysteria2 | 8844 | UDP |

## Regions

| Region | Short | CIDR |
|--------|-------|------|
| us-west-2 | US | 10.0.0.0/16 |
| ap-northeast-1 | JP | 10.1.0.0/16 |
| ap-east-2 | TW | 10.2.0.0/16 |

## Security Model

- **S3**: Private bucket, CloudFront OAC only
- **EC2**: No SSH (port 22 closed), SSM-only management
- **Credentials**: Secrets Manager, never in code/YAML
- **Tokens**: DynamoDB with enable/expire controls
- **Lambda**: Minimal IAM (DynamoDB read-only)

## Cost Estimate

~$15–30/month for 3x t3.micro instances + minimal Lambda/DynamoDB/CloudFront usage.
