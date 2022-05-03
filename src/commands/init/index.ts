import chalk from 'chalk'

import { Beland } from '../../lib/Beland'
import installDependencies from '../../project/installDependencies'
import { downloadRepoZip } from '../../utils/download'
import { fail, ErrorType } from '../../utils/errors'
import { isEmptyDirectory } from '../../utils/filesystem'
import * as spinner from '../../utils/spinner'
import { getInitOption, getRepositoryUrl } from './utils'
import { args } from './help'

export { help } from './help'

export async function main() {
  const dcl = new Beland({ workingDir: process.cwd() })
  const project = dcl.workspace.getSingleProject()
  const isEmpty = await isEmptyDirectory(process.cwd())
  if (!isEmpty) {
    fail(ErrorType.INIT_ERROR, `Project directory isn't empty`)
    return
  }

  if (!project) {
    fail(ErrorType.INIT_ERROR, 'Cannot init a project in workspace directory')
    return
  }
  const projectArg = args['--project']
  const choice = await getInitOption(projectArg)
  const url = getRepositoryUrl(choice)

  if (!url) {
    fail(ErrorType.INIT_ERROR, 'Cannot get a choice')
    return
  }

  try {
    spinner.create('Downloading example...')

    await downloadRepoZip(url, project.getProjectWorkingDir())

    spinner.succeed('Example downloaded')
  } catch (error: any) {
    spinner.fail(`Failed fetching the repo ${url}.`)
    fail(ErrorType.INIT_ERROR, error.message)
  }

  try {
    await installDependencies(dcl.getWorkingDir(), true)
  } catch (error: any) {
    fail(ErrorType.INIT_ERROR, error.message)
  }

  console.log(chalk.green(`\nSuccess! Run 'bld start' to see your scene\n`))
}
