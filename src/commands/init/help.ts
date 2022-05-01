import arg from 'arg'
import chalk from 'chalk'
import { getProjectTypes } from './utils'

export const args = arg({
  '--help': Boolean,
  '--project': String,
  '-h': '--help',
  '-p': '--project'
})

export const help = () => `
  Usage: ${chalk.bold('bld init [options]')}
    ${chalk.dim('Options:')}
    -h, --help               Displays complete help
    -p, --project [type] Choose a projectType (default is scene). It could be any of ${chalk.bold(
      getProjectTypes()
    )}
    ${chalk.dim('Examples:')}
    - Generate a new Beland Scene project in my-project folder
    ${chalk.green('$ bld init my-project')}
    - Generate a new scene project
    ${chalk.green('$ bld init --project scene')}
  `
