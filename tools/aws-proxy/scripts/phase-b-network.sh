#!/usr/bin/env bash
# Phase B: Network - VPC, Subnet, IGW, Route Table, Security Group per region
# Idempotent: checks if resources exist before creating

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_prerequisites

ACCOUNT_ID=$(get_account_id)
log_info "AWS Account: $ACCOUNT_ID"

# ============================================================
# Helper: find resource by Name tag in a region
# ============================================================
find_by_tag() {
  local region="$1"
  local resource_type="$2"
  local tag_name="$3"

  aws ec2 describe-tags \
    --region "$region" \
    --filters "Name=resource-type,Values=$resource_type" \
               "Name=key,Values=Name" \
               "Name=value,Values=$tag_name" \
    --query 'Tags[0].ResourceId' --output text 2>/dev/null
}

# ============================================================
# Main: setup VPC + networking for one region
# ============================================================
setup_region_network() {
  local region="$1"
  local short="$2"

  local idx
  idx=$(get_region_index "$region")
  local vpc_cidr="${REGION_CIDRS[$idx]}"
  local subnet_cidr="${REGION_SUBNETS[$idx]}"

  local vpc_name sg_name subnet_name igw_name rtb_name
  vpc_name=$(get_vpc_name "$short")
  subnet_name=$(get_subnet_name "$short")
  igw_name=$(get_igw_name "$short")
  rtb_name=$(get_rtb_name "$short")
  sg_name=$(get_sg_name "$short")

  # ----------------------------------------------------------
  # 1. VPC
  # ----------------------------------------------------------
  local vpc_id
  vpc_id=$(find_by_tag "$region" "vpc" "$vpc_name")

  if [[ -n "$vpc_id" && "$vpc_id" != "None" ]]; then
    log_info "VPC $vpc_name already exists: $vpc_id"
  else
    vpc_id=$(aws ec2 create-vpc \
      --region "$region" \
      --cidr-block "$vpc_cidr" \
      --query 'Vpc.VpcId' --output text)

    aws ec2 create-tags --region "$region" \
      --resources "$vpc_id" \
      --tags Key=Name,Value="$vpc_name" Key=Project,Value=proxy

    log_info "Created VPC $vpc_name: $vpc_id"
  fi

  # Enable DNS hostnames
  aws ec2 modify-vpc-attribute --region "$region" \
    --vpc-id "$vpc_id" \
    --enable-dns-hostnames '{"Value": true}'
  log_info "Enabled DNS hostnames on $vpc_id"

  save_output "vpc-${short}" "$vpc_id"

  # ----------------------------------------------------------
  # 2. Public Subnet
  # ----------------------------------------------------------
  local subnet_id
  subnet_id=$(find_by_tag "$region" "subnet" "$subnet_name")

  if [[ -n "$subnet_id" && "$subnet_id" != "None" ]]; then
    log_info "Subnet $subnet_name already exists: $subnet_id"
  else
    subnet_id=$(aws ec2 create-subnet \
      --region "$region" \
      --vpc-id "$vpc_id" \
      --cidr-block "$subnet_cidr" \
      --query 'Subnet.SubnetId' --output text)

    aws ec2 create-tags --region "$region" \
      --resources "$subnet_id" \
      --tags Key=Name,Value="$subnet_name" Key=Project,Value=proxy

    # Auto-assign public IPs
    aws ec2 modify-subnet-attribute --region "$region" \
      --subnet-id "$subnet_id" \
      --map-public-ip-on-launch

    log_info "Created subnet $subnet_name: $subnet_id"
  fi

  save_output "subnet-${short}" "$subnet_id"

  # ----------------------------------------------------------
  # 3. Internet Gateway
  # ----------------------------------------------------------
  local igw_id
  igw_id=$(find_by_tag "$region" "internet-gateway" "$igw_name")

  if [[ -n "$igw_id" && "$igw_id" != "None" ]]; then
    log_info "IGW $igw_name already exists: $igw_id"
  else
    igw_id=$(aws ec2 create-internet-gateway \
      --region "$region" \
      --query 'InternetGateway.InternetGatewayId' --output text)

    aws ec2 create-tags --region "$region" \
      --resources "$igw_id" \
      --tags Key=Name,Value="$igw_name" Key=Project,Value=proxy

    log_info "Created IGW $igw_name: $igw_id"
  fi

  # Attach to VPC (idempotent - ignore already-attached error)
  aws ec2 attach-internet-gateway --region "$region" \
    --internet-gateway-id "$igw_id" \
    --vpc-id "$vpc_id" 2>/dev/null || true
  log_info "IGW $igw_id attached to VPC $vpc_id"

  # ----------------------------------------------------------
  # 4. Route Table
  # ----------------------------------------------------------
  local rtb_id
  rtb_id=$(find_by_tag "$region" "route-table" "$rtb_name")

  if [[ -n "$rtb_id" && "$rtb_id" != "None" ]]; then
    log_info "Route table $rtb_name already exists: $rtb_id"
  else
    rtb_id=$(aws ec2 create-route-table \
      --region "$region" \
      --vpc-id "$vpc_id" \
      --query 'RouteTable.RouteTableId' --output text)

    aws ec2 create-tags --region "$region" \
      --resources "$rtb_id" \
      --tags Key=Name,Value="$rtb_name" Key=Project,Value=proxy

    log_info "Created route table $rtb_name: $rtb_id"
  fi

  # Add default route to IGW (idempotent - replace if exists)
  aws ec2 create-route --region "$region" \
    --route-table-id "$rtb_id" \
    --destination-cidr-block "0.0.0.0/0" \
    --gateway-id "$igw_id" 2>/dev/null || \
  aws ec2 replace-route --region "$region" \
    --route-table-id "$rtb_id" \
    --destination-cidr-block "0.0.0.0/0" \
    --gateway-id "$igw_id"
  log_info "Default route 0.0.0.0/0 -> $igw_id on $rtb_id"

  # Associate with subnet (check if already associated)
  local existing_assoc
  existing_assoc=$(aws ec2 describe-route-tables \
    --region "$region" \
    --route-table-ids "$rtb_id" \
    --query "RouteTables[0].Associations[?SubnetId=='${subnet_id}'].RouteTableAssociationId" \
    --output text 2>/dev/null)

  if [[ -z "$existing_assoc" || "$existing_assoc" == "None" ]]; then
    aws ec2 associate-route-table --region "$region" \
      --route-table-id "$rtb_id" \
      --subnet-id "$subnet_id" \
      --query 'AssociationId' --output text
    log_info "Associated $rtb_id with subnet $subnet_id"
  else
    log_info "Route table $rtb_id already associated with subnet $subnet_id"
  fi

  # ----------------------------------------------------------
  # 5. Security Group
  # ----------------------------------------------------------
  local sg_id
  sg_id=$(aws ec2 describe-security-groups \
    --region "$region" \
    --filters "Name=group-name,Values=${sg_name}" "Name=vpc-id,Values=${vpc_id}" \
    --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)

  if [[ -n "$sg_id" && "$sg_id" != "None" ]]; then
    log_info "Security group $sg_name already exists: $sg_id"
  else
    sg_id=$(aws ec2 create-security-group \
      --region "$region" \
      --group-name "$sg_name" \
      --description "Proxy node security group" \
      --vpc-id "$vpc_id" \
      --query 'GroupId' --output text)

    aws ec2 create-tags --region "$region" \
      --resources "$sg_id" \
      --tags Key=Name,Value="$sg_name" Key=Project,Value=proxy

    log_info "Created security group $sg_name: $sg_id"
  fi

  # Add ingress rules (idempotent - ignore duplicate errors)
  # VLESS on 443/tcp
  aws ec2 authorize-security-group-ingress --region "$region" \
    --group-id "$sg_id" \
    --protocol tcp --port "$VLESS_PORT" \
    --cidr "0.0.0.0/0" 2>/dev/null || true

  # Shadowsocks on 8388/tcp
  aws ec2 authorize-security-group-ingress --region "$region" \
    --group-id "$sg_id" \
    --protocol tcp --port "$SS_PORT" \
    --cidr "0.0.0.0/0" 2>/dev/null || true

  # Shadowsocks on 8388/udp
  aws ec2 authorize-security-group-ingress --region "$region" \
    --group-id "$sg_id" \
    --protocol udp --port "$SS_PORT" \
    --cidr "0.0.0.0/0" 2>/dev/null || true

  # Trojan on 8443/tcp
  aws ec2 authorize-security-group-ingress --region "$region" \
    --group-id "$sg_id" \
    --protocol tcp --port "$TROJAN_PORT" \
    --cidr "0.0.0.0/0" 2>/dev/null || true

  # Hysteria2 on 8844/udp
  aws ec2 authorize-security-group-ingress --region "$region" \
    --group-id "$sg_id" \
    --protocol udp --port "$HY2_PORT" \
    --cidr "0.0.0.0/0" 2>/dev/null || true

  log_info "Security group ingress rules configured for $sg_name"

  save_output "sg-${short}" "$sg_id"

  log_info "[$region] Network setup complete: VPC=$vpc_id Subnet=$subnet_id SG=$sg_id"
}

# ============================================================
# Execute: loop all regions
# ============================================================
log_info "=== Phase B: Network ==="

aws_region_loop setup_region_network

log_info "=== Phase B complete ==="
