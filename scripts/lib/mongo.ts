import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface AccessListEntry {
  ipAddress: string;
  comment?: string;
  cidrBlock?: string;
}

/**
 * Check if Atlas CLI is installed
 */
export function isAtlasCliInstalled(): boolean {
  try {
    execSync("atlas --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a profile is authenticated
 */
export async function isProfileAuthenticated(
  profile: string
): Promise<boolean> {
  try {
    await execAsync(`atlas config list --profile ${profile}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Login to Atlas with a specific profile (opens browser)
 */
export function loginWithProfile(profile: string): void {
  console.log(`Opening browser for authentication (profile: ${profile})...`);
  execSync(`atlas auth login --profile ${profile}`, { stdio: "inherit" });
}

/**
 * List projects for a profile
 */
export async function listProjects(
  profile: string
): Promise<Array<{ id: string; name: string }>> {
  const { stdout } = await execAsync(
    `atlas projects list --profile ${profile} --output json`
  );
  const data = JSON.parse(stdout);
  return data.results.map((p: { id: string; name: string }) => ({
    id: p.id,
    name: p.name,
  }));
}

/**
 * Get current access list for a project
 */
export async function getAccessList(
  profile: string,
  projectId: string
): Promise<AccessListEntry[]> {
  try {
    const { stdout } = await execAsync(
      `atlas accessLists list --profile ${profile} --projectId ${projectId} --output json`
    );
    const data = JSON.parse(stdout);
    return data.results || [];
  } catch {
    return [];
  }
}

/**
 * Delete an IP from access list
 */
export async function deleteAccessListEntry(
  profile: string,
  projectId: string,
  ipAddress: string
): Promise<void> {
  await execAsync(
    `atlas accessLists delete ${ipAddress} --profile ${profile} --projectId ${projectId} --force`
  );
}

/**
 * Add an IP to access list with comment
 */
export async function addAccessListEntry(
  profile: string,
  projectId: string,
  ipAddress: string,
  comment: string
): Promise<void> {
  await execAsync(
    `atlas accessLists create ${ipAddress} --profile ${profile} --projectId ${projectId} --comment "${comment}"`
  );
}

/**
 * Update IP by comment - finds existing entry with comment, deletes it, adds new IP with same comment
 */
export async function updateIpByComment(
  profile: string,
  projectId: string,
  newIp: string,
  comment: string
): Promise<{ action: "created" | "updated" | "unchanged"; oldIp?: string }> {
  const accessList = await getAccessList(profile, projectId);

  // Find entry with matching comment
  const existing = accessList.find((entry) => entry.comment === comment);

  if (existing) {
    if (existing.ipAddress === newIp || existing.cidrBlock === `${newIp}/32`) {
      return { action: "unchanged", oldIp: existing.ipAddress };
    }

    // Delete old entry
    const oldIp = existing.ipAddress || existing.cidrBlock?.replace("/32", "");
    if (oldIp) {
      await deleteAccessListEntry(profile, projectId, oldIp);
    }

    // Add new entry
    await addAccessListEntry(profile, projectId, newIp, comment);
    return { action: "updated", oldIp };
  }

  // No existing entry - create new
  await addAccessListEntry(profile, projectId, newIp, comment);
  return { action: "created" };
}

