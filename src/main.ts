import arg from "arg";
import chalk from "chalk";

import * as log from "./utils/logging";
import { loadConfig } from "./config";
import commands from "./commands";

log.debug(`Running with NODE_ENV: ${process.env.NODE_ENV}`);
log.debug(`Provided argv: ${JSON.stringify(process.argv)}`);

const args = arg(
  {
    "--help": Boolean,
    "--version": Boolean,
    "--network": String,
    "-h": "--help",
    "-v": "--version",
    "-n": "--network",
  },
  {
    permissive: true,
  }
);
log.debug(`Parsed args: ${JSON.stringify(args)}`);

const subcommand = args._[0];
log.debug(`Selected command ${chalk.bold(subcommand)}`);

const help = `
  ${chalk.bold("Beland CLI")}

  Usage: ${chalk.bold("bld [command] [options]")}

    ${chalk.dim("Commands:")}

      init                  Create a new Beland Scene project
      build                 Build scene
      start                 Start a local development server for a Beland Scene
      install               Sync beland libraries in bundleDependencies
      install package       Install a package
      deploy                Upload scene to a ipfs server
      help      [cmd]       Displays complete help for given command
      version               Display current version of bld
      coords                Set the parcels in your scene
      workspace subcommand  Make a workspace level action, bld help workspace for more information.          

    ${chalk.dim("Options:")}

      -h, --help          Displays complete help for used command or subcommand
      -v, --version       Display current version of bld

    ${chalk.dim("Example:")}

    - Show complete help for the subcommand "${chalk.dim("deploy")}"

      ${chalk.green("$ bld help deploy")}
`;

export async function main(version: string) {
  if (!process.argv.includes("--ci") && !process.argv.includes("--c")) {
    const network = args["--network"];
    if (network && network !== "mainnet" && network !== "ropsten") {
      console.error(
        log.error(
          `The only available values for ${chalk.bold(
            `'--network'`
          )} are ${chalk.bold(`'mainnet'`)} or ${chalk.bold(`'ropsten'`)}`
        )
      );
      process.exit(1);
    }

    await loadConfig(network || "mainnet");
  }

  if (subcommand === "version" || args["--version"]) {
    process.exit(0);
  }

  if (!subcommand) {
    console.log(help);
    process.exit(0);
  }

  if (subcommand === "help" || args["--help"]) {
    const command = subcommand === "help" ? args._[1] : subcommand;
    if (commands.has(command) && command !== "help") {
      try {
        const { help } = await import(`./commands/${command}`);
        console.log(help());
        process.exit(0);
      } catch (e: any) {
        console.error(log.error(e.message));
        process.exit(1);
      }
    }
    console.log(help);
    process.exit(0);
  }

  if (!commands.has(subcommand)) {
    if (subcommand.startsWith("-")) {
      console.error(
        log.error(
          `The "${chalk.bold(
            subcommand
          )}" option does not exist, run ${chalk.bold(
            '"dcl help"'
          )} for more info.`
        )
      );
      process.exit(1);
    }
    console.error(
      log.error(
        `The "${chalk.bold(
          subcommand
        )}" subcommand does not exist, run ${chalk.bold(
          '"dcl help"'
        )} for more info.`
      )
    );
    process.exit(1);
  }

  try {
    const command = await import(`./commands/${subcommand}`);
    await command.main();
  } catch (e: any) {
    console.error(
      log.error(
        `\`${chalk.green(`dcl ${subcommand}`)}\` ${e.message}, run ${chalk.bold(
          `"dcl help ${subcommand}"`
        )} for more info.`
      )
    );
    log.debug(e);
    process.exit(1);
  }
}
