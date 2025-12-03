#!/usr/bin/env npx tsx

import { loadConfig } from "./lib/config.js";
import { getCurrentIp } from "./lib/ip.js";
import { isAtlasCliInstalled, updateIpByComment } from "./lib/mongo.js";
import { isAwsCliInstalled, updateSshRuleByDescription } from "./lib/aws.js";

async function main() {
  console.log("\n=== IP Whitelist Update ===\n");

  const config = loadConfig();

  if (config.mongo.length === 0 && config.aws.length === 0) {
    console.log("⚠️ No accounts configured yet.");
    console.log("   Run: npm run add-mongo");
    process.exit(0);
  }

  // Get current IP
  console.log("🌐 Fetching current IP...");
  let currentIp: string;
  try {
    currentIp = await getCurrentIp();
    console.log(`   Current IP: ${currentIp}\n`);
  } catch (error) {
    console.error("❌ Failed to get current IP address");
    process.exit(1);
  }

  const comment = config.ipComment;
  let hasErrors = false;

  // Update MongoDB Atlas accounts
  if (config.mongo.length > 0) {
    console.log("📦 MongoDB Atlas:");

    if (!isAtlasCliInstalled()) {
      console.error("   ❌ Atlas CLI not installed");
      hasErrors = true;
    } else {
      for (const account of config.mongo) {
        process.stdout.write(`   [${account.profile}] ${account.name}... `);

        try {
          const result = await updateIpByComment(
            account.profile,
            account.projectId,
            currentIp,
            comment
          );

          switch (result.action) {
            case "created":
              console.log(`✅ Created "${comment}" → ${currentIp}`);
              break;
            case "updated":
              console.log(
                `✅ Updated "${comment}": ${result.oldIp} → ${currentIp}`
              );
              break;
            case "unchanged":
              console.log(`⏭️ Unchanged (already ${currentIp})`);
              break;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.log(`❌ Failed: ${message}`);
          hasErrors = true;
        }
      }
    }
    console.log();
  }

  // Update AWS Security Groups
  if (config.aws.length > 0) {
    console.log("☁️ AWS Security Groups:");

    if (!isAwsCliInstalled()) {
      console.error("   ❌ AWS CLI not installed");
      hasErrors = true;
    } else {
      for (const account of config.aws) {
        process.stdout.write(
          `   [${account.profile}] ${account.name} (${account.securityGroupId})... `
        );

        try {
          const result = await updateSshRuleByDescription(
            account.profile,
            account.region,
            account.securityGroupId,
            currentIp,
            comment
          );

          switch (result.action) {
            case "created":
              console.log(`✅ Created SSH rule "${comment}" → ${currentIp}/32`);
              break;
            case "updated":
              console.log(
                `✅ Updated SSH rule "${comment}": ${result.oldIp} → ${currentIp}`
              );
              break;
            case "unchanged":
              console.log(`⏭️ Unchanged (already ${currentIp}/32)`);
              break;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.log(`❌ Failed: ${message}`);
          hasErrors = true;
        }
      }
    }
    console.log();
  }

  // Summary
  if (hasErrors) {
    console.log("⚠️ Completed with some errors.\n");
    process.exit(1);
  } else {
    console.log("✅ All accounts updated successfully!\n");
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
