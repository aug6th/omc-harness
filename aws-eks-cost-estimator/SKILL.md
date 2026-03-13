---
name: aws-eks-cost-estimator
description: Estimate current AWS EKS cluster costs from Terraform, Terragrunt, or user-supplied node specs. Use when the user asks for the latest EKS or Kubernetes cluster cost, wants a monthly or hourly estimate, wants Seoul-region or other region-specific AWS pricing, or wants EC2, EKS control plane, EBS, ALB, NLB, NAT Gateway, and related AWS infrastructure costs broken down.
---

# AWS EKS Cost Estimator

Estimate AWS EKS cluster cost with current official AWS pricing. Prefer concise output that separates confirmed cost from optional or unknown items.

## Workflow

1. Identify the deployed shape.
   - Inspect Terraform or Terragrunt first.
   - Look for EKS cluster definitions, managed node groups, launch templates, volume sizes, load balancers, NAT gateways, and public IPv4 usage.
   - If the IaC is incomplete, ask the user only for the missing quantities that materially change the estimate, such as node counts, instance types, or disk sizes.

2. Confirm pricing from official AWS sources for the current date.
   - Use AWS pricing pages or the AWS Price List API.
   - Prefer Price List API for EC2, EBS, ELB, and EKS region-specific rates.
   - Treat pricing as time-sensitive and verify it every time the user asks for "latest", "current", or a dated estimate.

3. Calculate the baseline first.
   - Include EKS control plane hourly price.
   - Include EC2 On-Demand hourly price for each node type unless the user asks for Spot, Savings Plans, or Reserved pricing.
   - Convert to monthly using `730` hours unless the user gives another convention.

4. Add optional or uncertain items separately.
   - EBS root or data volumes
   - ALB hourly charge and LCU
   - NLB hourly charge and NLCU
   - NAT Gateway hourly and per-GB processing
   - Public IPv4, data transfer, CloudWatch, Route 53, ECR, and other peripheral costs
   - If usage-based components are unknown, show the fixed portion and call out the missing usage driver.

5. Present assumptions explicitly.
   - Region
   - Purchase option: On-Demand, Spot, Savings Plan, or RI
   - OS and tenancy
   - Monthly-hour convention
   - Which items are included and excluded

## Pricing Sources

- EKS pricing page: `https://aws.amazon.com/eks/pricing/`
- AWS Price List API root: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json`
- Regional EC2 catalog pattern:
  `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/<region-code>/index.json`
- Regional ELB catalog pattern:
  `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/<region-code>/index.json`
- EKS catalog:
  `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEKS/current/index.json`
- VPC pricing page for NAT Gateway if Price List lookup is slow:
  `https://aws.amazon.com/vpc/pricing/`

## Useful Lookup Patterns

- EC2 filter:
  `instanceType`, `operatingSystem=Linux`, `tenancy=Shared`, `preInstalledSw=NA`, `capacitystatus=Used`, `licenseModel=No License required`
- EKS standard cluster fee usage type:
  `APN2-AmazonEKS-Hours:perCluster` for Seoul
- EBS gp3:
  filter `productFamily=Storage`, `volumeApiName=gp3`
- ALB:
  `productFamily=Load Balancer-Application`, usage types `LoadBalancerUsage` and `LCUUsage`
- NLB:
  `productFamily=Load Balancer-Network`, usage types `LoadBalancerUsage` and `LCUUsage`

## Output Shape

Keep the answer compact and structured:

- State the date and pricing basis.
- Show hourly subtotal by component.
- Show monthly subtotal by component.
- Show total confirmed fixed cost.
- List excluded or variable costs separately.
- Include links to the official sources used.

## Calculation Rules

- Monthly estimate default: `hourly_price * 730`
- Node group total: `instance_hourly_price * desired_node_count`
- EBS monthly: `gb_month_rate * provisioned_gb`
- Do not bury uncertain usage-based costs inside the headline total.
- If the repo contains uncommitted or incomplete IaC, say so and base the calculation on the best confirmed inputs.
