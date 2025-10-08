#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Version management script
 * Usage: deno run version patch|minor|major
 */

type VersionType = "patch" | "minor" | "major";

/**
 * Parse version string
 */
function parseVersion(version: string): [number, number, number] {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return parts as [number, number, number];
}

/**
 * Increment version number
 */
function incrementVersion(
  version: string,
  type: VersionType
): string {
  const [major, minor, patch] = parseVersion(version);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

/**
 * Read JSON file
 */
async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  const content = await Deno.readTextFile(path);
  return JSON.parse(content);
}

/**
 * Write JSON file
 */
async function writeJsonFile(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  const content = JSON.stringify(data, null, 2) + "\n";
  await Deno.writeTextFile(path, content);
}

/**
 * Execute command
 */
async function runCommand(cmd: string[]): Promise<void> {
  console.log(`Executing command: ${cmd.join(" ")}`);
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd.join(" ")}`);
  }
}

/**
 * Main function
 */
async function main() {
  // Get version type argument
  const versionType = Deno.args[0] as VersionType;
  if (!["patch", "minor", "major"].includes(versionType)) {
    console.error("Usage: deno run version patch|minor|major");
    Deno.exit(1);
  }

  try {
    // Read package.json
    const packageJsonPath = "package.json";
    const packageJson = await readJsonFile(packageJsonPath);
    const currentVersion = packageJson.version as string;

    console.log(`Current version: ${currentVersion}`);

    // Calculate new version
    const newVersion = incrementVersion(currentVersion, versionType);
    console.log(`New version: ${newVersion}`);

    // Update package.json
    packageJson.version = newVersion;
    await writeJsonFile(packageJsonPath, packageJson);
    console.log(`✓ Updated ${packageJsonPath}`);

    // Update deno.json
    const denoJsonPath = "deno.json";
    const denoJson = await readJsonFile(denoJsonPath);
    denoJson.version = newVersion;
    await writeJsonFile(denoJsonPath, denoJson);
    console.log(`✓ Updated ${denoJsonPath}`);

    // Git operations
    console.log("\nStarting Git operations...");
    await runCommand(["git", "add", "."]);
    await runCommand(["git", "commit", "-m", `release: ${newVersion}`]);
    await runCommand(["git", "push"]);

    console.log(`\n✓ Version released successfully: ${newVersion}`);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    Deno.exit(1);
  }
}

// Run main function
if (import.meta.main) {
  main();
}

