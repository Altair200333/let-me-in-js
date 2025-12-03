#!/usr/bin/env npx tsx

import * as readline from "readline";
import { loadConfig, saveConfig, type AwsAccount } from "./lib/config.js";
import {
  isAwsCliInstalled,
  isProfileConfigured,
  configureProfile,
  listSecurityGroups,
} from "./lib/aws.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

/**
 * TODO ask user to run aws configure --profile whitelist-me manually first
 */
async function main() {
  console.log("\n=== Add AWS Account ===\n");

  // Check if AWS CLI is installed
  if (!isAwsCliInstalled()) {
    console.error("❌ AWS CLI is not installed.");
    console.error("   Install it from: https://aws.amazon.com/cli/");
    console.error("   Or run: winget install Amazon.AWSCLI");
    process.exit(1);
  }

  // Get account details
  const name = await question("Enter a friendly name for this account: ");
  if (!name) {
    console.error("❌ Name is required");
    process.exit(1);
  }

  const profile = await question(
    "Enter AWS CLI profile name (e.g., default, prod, personal): "
  );
  if (!profile) {
    console.error("❌ Profile name is required");
    process.exit(1);
  }

  // Check if profile exists or needs configuration
  const isConfigured = await isProfileConfigured(profile);
  if (!isConfigured) {
    console.log(
      `\n⚠️ Profile "${profile}" is not configured or credentials are invalid.`
    );
    const configure = await question(
      "Do you want to configure it now? [Y/n]: "
    );
    if (configure.toLowerCase() !== "n") {
      configureProfile(profile);
    } else {
      console.log(
        "Cancelled. Please configure the profile first with: aws configure --profile " +
          profile
      );
      process.exit(0);
    }
  } else {
    console.log(`✓ Profile "${profile}" is configured and valid.`);
  }

  // Get region
  const region = await question(
    "Enter AWS region (e.g., eu-central-1, us-east-1): "
  );
  if (!region) {
    console.error("❌ Region is required");
    process.exit(1);
  }

  // List security groups
  console.log("\n📋 Fetching security groups...\n");
  let securityGroups: Array<{
    GroupId: string;
    GroupName: string;
    Description: string;
  }>;
  try {
    securityGroups = await listSecurityGroups(profile, region);
  } catch (error) {
    console.error(
      "❌ Failed to list security groups. Check your credentials and region."
    );
    process.exit(1);
  }

  if (securityGroups.length === 0) {
    console.error("❌ No security groups found in this region");
    process.exit(1);
  }

  console.log("Available security groups:");
  securityGroups.forEach((sg, i) => {
    console.log(
      `  ${i + 1}. ${sg.GroupName} (${sg.GroupId}) - ${
        sg.Description || "No description"
      }`
    );
  });

  const selection = await question(
    `\nSelect security group [1-${securityGroups.length}]: `
  );
  const index = parseInt(selection, 10) - 1;

  if (isNaN(index) || index < 0 || index >= securityGroups.length) {
    console.error("❌ Invalid selection");
    process.exit(1);
  }

  const selectedSg = securityGroups[index];

  // Save to config
  const config = loadConfig();

  // Check if entry already exists
  const existingIndex = config.aws.findIndex(
    (a) => a.profile === profile && a.securityGroupName === selectedSg.GroupName
  );

  const newAccount: AwsAccount = {
    name,
    profile,
    region,
    securityGroupName: selectedSg.GroupName,
  };

  if (existingIndex >= 0) {
    const overwrite = await question(
      `\n⚠️ Entry for this profile + security group already exists. Overwrite? [y/N]: `
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log("Cancelled.");
      process.exit(0);
    }
    config.aws[existingIndex] = newAccount;
  } else {
    config.aws.push(newAccount);
  }

  saveConfig(config);

  console.log(`\n✅ AWS account "${name}" added successfully!`);
  console.log(`   Profile: ${profile}`);
  console.log(`   Region: ${region}`);
  console.log(
    `   Security Group: ${selectedSg.GroupName} (${selectedSg.GroupId})`
  );

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error.message);
  rl.close();
  process.exit(1);
});
