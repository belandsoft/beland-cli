import inquirer, { Questions } from "inquirer";
import chalk from "chalk";
import arg from "arg";
import { sdk } from "@dcl/schemas";

import { Beland } from "../lib/Beland";
import { warning } from "../utils/logging";
import { fail, ErrorType } from "../utils/errors";

import type = sdk.ProjectType;
import { isEmptyDirectory } from "../utils/filesystem";

export const help = () => `
  Usage: ${chalk.bold("dcl init [options]")}

    ${chalk.dim("Options:")}

    -h, --help               Displays complete help
    -p, --project [type] Choose a projectType (default is scene). It could be any of ${chalk.bold(
      getProjectTypes()
    )}

    ${chalk.dim("Examples:")}

    - Generate a new Decentraland Scene project in my-project folder

    ${chalk.green("$ bld init my-project")}

    - Generate a new scene project

    ${chalk.green("$ bld init --project scene")}
`;

function getProjectTypes() {
  return Object.values(type)
    .filter((a) => typeof a === "string")
    .join(", ");
}

async function getprojectType(type?: string): Promise<sdk.ProjectType> {
  if (!type) {
    const choices = [
      { value: sdk.ProjectType.SCENE, name: "Scene" },
      { value: sdk.ProjectType.SMART_ITEM, name: "Smart Item" },
      {
        value: sdk.ProjectType.PORTABLE_EXPERIENCE,
        name: "Smart Wearable (Beta)",
      },
    ];

    const projectTypeList: Questions = [
      {
        type: "list",
        name: "project",
        message: "Choose a project type",
        choices,
      },
    ];
    const answers = await inquirer.prompt(projectTypeList);
    const projectType: sdk.ProjectType = answers.project;

    return projectType;
  }

  if (!sdk.ProjectType.validate(type)) {
    fail(
      ErrorType.INIT_ERROR,
      `Invalid projectType: "${chalk.bold(
        type
      )}". Supported types are ${chalk.bold(getProjectTypes())}`
    );
  }

  return type as sdk.ProjectType;
}

export async function main() {
  const args = arg({
    "--help": Boolean,
    "--project": String,
    "-h": "--help",
    "-p": "--project",
  });
  const bld = new Beland({ workingDir: process.cwd() });
  const project = bld.workspace.getSingleProject();
  const isEmpty = await isEmptyDirectory(process.cwd());

  if (!isEmpty) {
    const results = await inquirer.prompt({
      type: "confirm",
      name: "continue",
      message: warning(
        `Project directory isn't empty. Do you want to continue?`
      ),
    });

    if (!results.continue) {
      return;
    }
  }

  if (!project) {
    fail(
      ErrorType.INIT_ERROR,
      "Cannot try to init a project in workspace directory"
    );
    return;
  }

  await project.validateNewProject();

  const projectType = await getprojectType(args["--project"]);
  await project.writeBldIgnore();
  await project.writeSceneFile({});
  await project.scaffoldProject(projectType);

  console.log(chalk.green(`\nSuccess! Run 'bld start' to see your scene\n`));
}
