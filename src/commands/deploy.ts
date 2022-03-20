import arg from "arg";
import chalk from "chalk";

import { Beland } from "../lib/Beland";
import { IFile } from "../lib/Project";
import * as spinner from "../utils/spinner";
import { ErrorType, fail } from "../utils/errors";
import { createMetadata, uploadFile } from "../utils/ipfs";
import FormData from "form-data";
export const help = () => `
  Usage: ${chalk.bold("bld deploy [options]")}

    ${chalk.dim("Options:")}

      -h, --help                Displays complete help
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy

    ${chalk.dim("Example:")}

    - Deploy your scene:

      ${chalk.green("$ bld deploy")}
`;

export function failWithSpinner(message: string, error?: any): void {
  spinner.fail(message);
  fail(ErrorType.DEPLOY_ERROR, error);
}

export async function main(): Promise<void> {
  const args = arg({
    "--help": Boolean,
    "-h": "--help",
    "--skip-version-checks": Boolean,
    "--skip-build": Boolean,
    "--https": Boolean,
    "--force-upload": Boolean,
    "--yes": Boolean,
  });

  const workDir = process.cwd();
  const bld = new Beland({
    isHttps: !!args["--https"],
    workingDir: workDir,
    forceDeploy: args["--force-upload"],
    yes: args["--yes"],
  });

  const project = bld.workspace.getSingleProject();
  if (project == null) return;

  // Obtain list of files to deploy
  let originalFilesToIgnore = await project.getBLDIgnore();
  if (originalFilesToIgnore === null) {
    originalFilesToIgnore = await project.writeBldIgnore();
  }
  let filesToIgnorePlusEntityJson = originalFilesToIgnore;
  if (!filesToIgnorePlusEntityJson.includes("entity.json")) {
    filesToIgnorePlusEntityJson =
      filesToIgnorePlusEntityJson + "\n" + "entity.json";
  }

  const files: IFile[] = await project.getFiles(filesToIgnorePlusEntityJson);
  let metadata: any = {
    type: "scene",
    contents: [],
  };

  let stt = 0;
  for (const file of files) {
    stt++;
    const form = new FormData();
    form.append("file", file.content, file.path);
    const res: any = await uploadFile(form);
    metadata.contents.push({
      path: file.path,
      hash: res[0].hash,
    });

    console.log(
      `Uploading (${stt}/${files.length}): ${file.path}, hash: ${res[0].hash}`
    );
  }
  let metadataResult: any = await createMetadata(metadata);
  console.log(
    "Deployment structure created. ipfs://" + metadataResult.ipfs_uri
  );
}
