import chalk from "chalk";

import { createWorkspace } from "../lib/Workspace";
import { fail } from "assert";

export const help = () => `
  Usage: ${chalk.bold("dcl build [options]")}

    ${chalk.dim("Options:")}

      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway

    ${chalk.dim("Example:")}

    - Build your scene:

    ${chalk.green("$ bld build")}
`;

export async function main(): Promise<number> {
  const workingDir = process.cwd();
  const workspace = createWorkspace({ workingDir });

  if (!workspace.isSingleProject()) {
    fail(`Can not build a workspace. It isn't supported yet.`);
  }

  return 0;
}
