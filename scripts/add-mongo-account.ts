#!/usr/bin/env npx tsx

import * as readline from "readline";
import { loadConfig, saveConfig, type MongoAccount } from "./lib/config.js";
import {
  isAtlasCliInstalled,
  loginWithProfile,
  listProjects,
} from "./lib/mongo.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log("\n=== Add MongoDB Atlas Account ===\n");

  // Check if Atlas CLI is installed
  if (!isAtlasCliInstalled()) {
    console.error("❌ MongoDB Atlas CLI is not installed.");
    console.error("   Install it with: winget install MongoDB.AtlasCLI");
    process.exit(1);
  }

  // Get account details
  const name = await question("Enter a friendly name for this account: ");
  if (!name) {
    console.error("❌ Name is required");
    process.exit(1);
  }

  const profile = await question(
    "Enter Atlas CLI profile name (e.g., work, personal): "
  );
  if (!profile) {
    console.error("❌ Profile name is required");
    process.exit(1);
  }

  // Authenticate
  console.log("\n📝 Authenticating with Atlas...\n");
  try {
    loginWithProfile(profile);
  } catch (error) {
    console.error("❌ Authentication failed");
    process.exit(1);
  }

  // List projects
  console.log("\n📋 Fetching projects...\n");
  let projects: Array<{ id: string; name: string }>;
  try {
    projects = await listProjects(profile);
  } catch (error) {
    console.error("❌ Failed to list projects. Is the account authenticated?");
    process.exit(1);
  }

  if (projects.length === 0) {
    console.error("❌ No projects found in this account");
    process.exit(1);
  }

  console.log("Available projects:");
  projects.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
  });

  const selection = await question(`\nSelect project [1-${projects.length}]: `);
  const index = parseInt(selection, 10) - 1;

  if (isNaN(index) || index < 0 || index >= projects.length) {
    console.error("❌ Invalid selection");
    process.exit(1);
  }

  const selectedProject = projects[index];

  // Save to config
  const config = loadConfig();

  // Check if profile already exists
  const existingIndex = config.mongo.findIndex((m) => m.profile === profile);
  const newAccount: MongoAccount = {
    name,
    profile,
    projectId: selectedProject.id,
  };

  if (existingIndex >= 0) {
    const overwrite = await question(
      `\n⚠️ Profile "${profile}" already exists. Overwrite? [y/N]: `
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log("Cancelled.");
      process.exit(0);
    }
    config.mongo[existingIndex] = newAccount;
  } else {
    config.mongo.push(newAccount);
  }

  saveConfig(config);

  console.log(`\n✅ Account "${name}" added successfully!`);
  console.log(`   Profile: ${profile}`);
  console.log(`   Project: ${selectedProject.name} (${selectedProject.id})`);

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error.message);
  rl.close();
  process.exit(1);
});

