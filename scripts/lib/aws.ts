import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface SecurityGroupRule {
  SecurityGroupRuleId: string;
  GroupId: string;
  IpProtocol: string;
  FromPort: number;
  ToPort: number;
  CidrIpv4?: string;
  Description?: string;
}

export interface SecurityGroup {
  GroupId: string;
  GroupName: string;
  Description: string;
  VpcId: string;
}

/**
 * Check if AWS CLI is installed
 */
export function isAwsCliInstalled(): boolean {
  try {
    execSync("aws --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if AWS profile is configured
 */
export async function isProfileConfigured(profile: string): Promise<boolean> {
  try {
    await execAsync(`aws sts get-caller-identity --profile ${profile}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Configure AWS profile (interactive - asks for keys)
 */
export function configureProfile(profile: string): void {
  console.log(`\nConfiguring AWS profile "${profile}"...`);
  console.log(
    "You will be prompted for Access Key ID and Secret Access Key.\n"
  );
  execSync(`aws configure --profile ${profile}`, { stdio: "inherit" });
}

/**
 * List security groups in a region
 */
export async function listSecurityGroups(
  profile: string,
  region: string
): Promise<SecurityGroup[]> {
  const { stdout } = await execAsync(
    `aws ec2 describe-security-groups --profile ${profile} --region ${region} --output json`
  );
  const data = JSON.parse(stdout);
  return data.SecurityGroups || [];
}

/**
 * Find security group by name
 */
export async function findSecurityGroupByName(
  profile: string,
  region: string,
  groupName: string
): Promise<SecurityGroup | null> {
  try {
    const { stdout } = await execAsync(
      `aws ec2 describe-security-groups --profile ${profile} --region ${region} --filters "Name=group-name,Values=${groupName}" --output json`
    );
    const data = JSON.parse(stdout);
    return data.SecurityGroups?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get inbound rules for a security group
 */
export async function getSecurityGroupRules(
  profile: string,
  region: string,
  groupId: string
): Promise<SecurityGroupRule[]> {
  try {
    const { stdout } = await execAsync(
      `aws ec2 describe-security-group-rules --profile ${profile} --region ${region} --filters "Name=group-id,Values=${groupId}" --output json`
    );
    const data = JSON.parse(stdout);
    // Filter to only inbound rules (IsEgress = false)
    return (data.SecurityGroupRules || []).filter(
      (rule: SecurityGroupRule & { IsEgress: boolean }) => !rule.IsEgress
    );
  } catch {
    return [];
  }
}

/**
 * Find SSH rule by description
 */
export function findSshRuleByDescription(
  rules: SecurityGroupRule[],
  description: string
): SecurityGroupRule | undefined {
  return rules.find(
    (rule) =>
      rule.FromPort === 22 &&
      rule.ToPort === 22 &&
      rule.IpProtocol === "tcp" &&
      rule.Description === description
  );
}

/**
 * Revoke (delete) a security group rule
 */
export async function revokeSecurityGroupRule(
  profile: string,
  region: string,
  groupId: string,
  ruleId: string
): Promise<void> {
  await execAsync(
    `aws ec2 revoke-security-group-ingress --profile ${profile} --region ${region} --group-id ${groupId} --security-group-rule-ids ${ruleId}`
  );
}

/**
 * Add SSH rule with description
 */
export async function addSshRule(
  profile: string,
  region: string,
  groupId: string,
  ip: string,
  description: string
): Promise<void> {
  const ipPermissions = JSON.stringify([
    {
      IpProtocol: "tcp",
      FromPort: 22,
      ToPort: 22,
      IpRanges: [
        {
          CidrIp: `${ip}/32`,
          Description: description,
        },
      ],
    },
  ]);

  // Escape for Windows PowerShell
  const escaped = ipPermissions.replace(/"/g, '\\"');

  await execAsync(
    `aws ec2 authorize-security-group-ingress --profile ${profile} --region ${region} --group-id ${groupId} --ip-permissions "${escaped}"`
  );
}

/**
 * Update SSH rule by description - finds existing rule, deletes it, adds new with same description
 */
export async function updateSshRuleByDescription(
  profile: string,
  region: string,
  securityGroupId: string,
  newIp: string,
  description: string
): Promise<{ action: "created" | "updated" | "unchanged"; oldIp?: string }> {
  // Get current rules
  const rules = await getSecurityGroupRules(profile, region, securityGroupId);

  // Find existing SSH rule with matching description
  const existingRule = findSshRuleByDescription(rules, description);

  if (existingRule) {
    const oldIp = existingRule.CidrIpv4?.replace("/32", "");

    // Check if IP is already the same
    if (existingRule.CidrIpv4 === `${newIp}/32`) {
      return { action: "unchanged", oldIp };
    }

    // Delete old rule
    await revokeSecurityGroupRule(
      profile,
      region,
      securityGroupId,
      existingRule.SecurityGroupRuleId
    );

    // Add new rule
    await addSshRule(profile, region, securityGroupId, newIp, description);
    return { action: "updated", oldIp };
  }

  // No existing rule - create new
  await addSshRule(profile, region, securityGroupId, newIp, description);
  return { action: "created" };
}
