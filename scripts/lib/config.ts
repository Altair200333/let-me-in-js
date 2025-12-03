import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "config.json");

export interface MongoAccount {
  name: string;
  profile: string;
  projectId: string;
}

export interface AwsAccount {
  name: string;
  profile: string;
  region: string;
  securityGroupId: string;
}

export interface Config {
  ipComment: string;
  mongo: MongoAccount[];
  aws: AwsAccount[];
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    // Create default config
    const defaultConfig: Config = {
      ipComment: "MyDevMachine",
      mongo: [],
      aws: [],
    };
    saveConfig(defaultConfig);
    return defaultConfig;
  }

  const content = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(content) as Config;
}

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

