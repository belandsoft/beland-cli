import os from "os";
import arg from "arg";
import chalk from "chalk";
import opn from "opn";

import { Beland } from "../lib/Beland";

import { isEnvCi } from "../utils/env";
import * as spinner from "../utils/spinner";
import isECSInstalled from "../project/isECSInstalled";
import { lintSceneFile } from "../sceneJson/lintSceneFile";

export const help = () => `
  Usage: ${chalk.bold("bld start [options]")}

    ${chalk.dim("Options:")}

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -d, --no-debug            Disable debugging panel
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server
      --web3                    Connects preview to browser wallet to use the associated avatar and account
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build and only serve the files in preview mode

    ${chalk.dim("Examples:")}

    - Start a local development server for a Beland Scene at port 3500

      ${chalk.green("$ bld start -p 3500")}

    - Start a local development server for a Beland Scene at a docker container

      ${chalk.green("$ bld start --ci")}
`;

export async function main() {
  const args = arg({
    "--help": Boolean,
    "--port": String,
    "--no-debug": Boolean,
    "--no-browser": Boolean,
    "--no-watch": Boolean,
    "--ci": Boolean,
    "--skip-version-checks": Boolean,
    "--web3": Boolean,
    "-h": "--help",
    "-p": "--port",
    "-d": "--no-debug",
    "-b": "--no-browser",
    "-w": "--no-watch",
    "-c": "--ci",
    "--skip-build": Boolean,
  });

  const isCi = args["--ci"] || isEnvCi();
  const debug = !args["--no-debug"] && !isCi;
  const openBrowser = !args["--no-browser"] && !isCi;
  const skipBuild = args["--skip-build"];
  const watch = !args["--no-watch"] && !isCi && !skipBuild;
  const workingDir = process.cwd();

  const bld = new Beland({
    previewPort: parseInt(args["--port"]!, 10),
    watch,
    workingDir,
  });

  const enableWeb3 = args["--web3"];

  for (const project of bld.workspace.getAllProjects()) {
    if (!skipBuild) {
      spinner.create(`Checking if SDK is installed in project`);

      const [ECSInstalled] = await Promise.all([
        isECSInstalled(project.getProjectWorkingDir()),
      ]);

      if (!ECSInstalled) {
        spinner.info("SDK not found. Installing dependencies...");
      }
    }

    await lintSceneFile(project.getProjectWorkingDir());
  }

  const baseCoords = await bld.workspace.getBaseCoords();
  const hasPortableExperience = bld.workspace.hasPortableExperience();

  bld.on("preview:ready", (port) => {
    const ifaces = os.networkInterfaces();
    const availableURLs: string[] = [];

    console.log(""); // line break

    console.log(`Preview server is now running`);

    console.log(chalk.bold("\n  Available on:\n"));

    Object.keys(ifaces).forEach((dev) => {
      ifaces[dev].forEach((details) => {
        if (details.family === "IPv4") {
          let addr = `http://${details.address}:${port}?position=${baseCoords.x}%2C${baseCoords.y}`;
          if (debug) {
            addr = `${addr}&SCENE_DEBUG_PANEL`;
          }
          if (enableWeb3 || hasPortableExperience) {
            addr = `${addr}&ENABLE_WEB3`;
          }
          availableURLs.push(addr);
        }
      });
    });

    // Push localhost and 127.0.0.1 at top
    const sortedURLs = availableURLs.sort((a, _b) => {
      return a.toLowerCase().includes("localhost") ||
        a.includes("127.0.0.1") ||
        a.includes("0.0.0.0")
        ? -1
        : 1;
    });

    for (const addr of sortedURLs) {
      console.log(`    ${addr}`);
    }

    console.log(chalk.bold("\n  Details:\n"));
    console.log(chalk.grey("\nPress CTRL+C to exit\n"));

    // Open preferably localhost/127.0.0.1
    if (openBrowser && sortedURLs.length) {
      void opn(sortedURLs[0]).catch();
    }
  });

  await bld.preview();
}
