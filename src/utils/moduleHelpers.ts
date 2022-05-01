import path from "path";
import { spawn } from "child_process";
import semver from "semver";
import fetch from "node-fetch";
import packageJson from "package-json";

import * as spinner from "./spinner";
import { readJSON } from "./filesystem";
import { getNodeModulesPath } from "./project";

export const npm = /^win/.test(process.platform) ? "npm.cmd" : "npm";
let version: string | null = null;

export function setVersion(v: string) {
  version = v;
}

export function buildTypescript({
  workingDir,
  watch,
  production,
  silence = false,
}: {
  workingDir: string;
  watch: boolean;
  production: boolean;
  silence?: boolean;
}): Promise<void> {
  const command = watch ? "watch" : "build";
  const NODE_ENV = production ? "production" : "";

  return new Promise((resolve, reject) => {
    const child = spawn(npm, ["run", command], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV },
    });

    if (!silence) {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }

    child.stdout.on("data", (data) => {
      if (
        data.toString().indexOf("The compiler is watching file changes...") !==
        -1
      ) {
        if (!silence) spinner.succeed("Project built.");
        return resolve();
      }
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const msg = "Error while building the project";
        if (!silence) spinner.fail(msg);
        reject(new Error(msg));
      } else {
        if (!silence) spinner.succeed("Project built.");
        return resolve();
      }
    });
  });
}

export async function getLatestVersion(name: string): Promise<string> {
  if (!(await isOnline())) {
    return "";
  }

  try {
    // NOTE: this packageJson function should receive the workingDir
    const pkg = await packageJson(name.toLowerCase());
    return pkg.version as string;
  } catch (e) {
    return "";
  }
}

export async function getInstalledVersion(
  workingDir: string,
  name: string
): Promise<string> {
  let belandApiPkg: { version: string };

  try {
    belandApiPkg = await readJSON<{ version: string }>(
      path.resolve(getNodeModulesPath(workingDir), name, "package.json")
    );
  } catch (e) {
    return "";
  }

  return belandApiPkg.version;
}

export async function getOutdatedApi(workingDir: string): Promise<
  | {
      package: string;
      installedVersion: string;
      latestVersion: string;
    }
  | undefined
> {
  const belandApiVersion = await getInstalledVersion(
    workingDir,
    "beland-api"
  );
  const belandEcsVersion = await getInstalledVersion(
    workingDir,
    "beland-ecs"
  );

  if (belandEcsVersion) {
    const latestVersion = await getLatestVersion("beland-ecs");
    if (latestVersion && semver.lt(belandEcsVersion, latestVersion)) {
      return {
        package: "beland-ecs",
        installedVersion: belandEcsVersion,
        latestVersion,
      };
    }
  } else if (belandApiVersion) {
    const latestVersion = await getLatestVersion("beland-api");
    if (latestVersion && semver.lt(belandApiVersion, latestVersion)) {
      return {
        package: "beland-api",
        installedVersion: belandApiVersion,
        latestVersion,
      };
    }
  }

  return undefined;
}

export async function getCLIPackageJson<T = any>(): Promise<T> {
  return readJSON<T>(path.resolve(__dirname, "..", "..", "package.json"));
}

export function getInstalledCLIVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return version || require("../../package.json").version;
}

export function isStableVersion(): boolean {
  return !getInstalledCLIVersion().includes("commit");
}

export async function isCLIOutdated(): Promise<boolean> {
  const cliVersion = getInstalledCLIVersion();
  const cliVersionLatest = await getLatestVersion("beland");

  if (
    cliVersionLatest &&
    cliVersion &&
    semver.lt(cliVersion, cliVersionLatest)
  ) {
    return true;
  } else {
    return false;
  }
}

export function isOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    fetch("https://beland.io/ping")
      .then(() => resolve(true))
      .catch(() => resolve(false));
    setTimeout(() => {
      resolve(false);
    }, 4000);
  });
}

export async function isECSVersionLower(
  workingDir: string,
  version: string
): Promise<boolean> {
  const ecsPackageJson = await readJSON<{
    version: string;
  }>(
    path.resolve(
      getNodeModulesPath(workingDir),
      "beland-ecs",
      "package.json"
    )
  );

  if (semver.lt(ecsPackageJson.version, version)) {
    return true;
  }
  return false;
}

export async function checkECSAndCLIVersions(workingDir: string) {
  const ecsPackageJson = await readJSON<{
    minCliVersion?: string;
    version: string;
  }>(
    path.resolve(
      getNodeModulesPath(workingDir),
      "beland-ecs",
      "package.json"
    )
  );

  const cliPackageJson = await getCLIPackageJson<{
    minEcsVersion?: boolean;
    version: string;
  }>();

  if (
    cliPackageJson.minEcsVersion &&
    semver.lt(ecsPackageJson.version, `${cliPackageJson.minEcsVersion}`)
  ) {
    throw new Error(
      [
        "This version of beland-cli (bld) requires an ECS version higher than",
        cliPackageJson.minEcsVersion,
        "the installed version is",
        ecsPackageJson.version,
        "please go to https://docs.beland.io/development-guide/installation-guide/ to know more about the versions and upgrade guides",
      ].join(" ")
    );
  }
  if (
    ecsPackageJson.minCliVersion &&
    semver.lt(cliPackageJson.version, ecsPackageJson.minCliVersion)
  ) {
    throw new Error(
      [
        "This version of beland-ecs requires a version of the ECS beland-cli (bld) higher than",
        ecsPackageJson.minCliVersion,
        "the installed version is",
        cliPackageJson.version,
        "please go to https://docs.beland.io/development-guide/installation-guide/ to know more about the versions and upgrade guides",
      ].join(" ")
    );
  }
}
