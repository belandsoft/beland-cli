import arg from 'arg'
import chalk from 'chalk'
import { Authenticator } from 'beland-crypto'

import { Beland } from '../lib/Beland'
import { IFile } from '../lib/Project'
import * as spinner from '../utils/spinner'
import { ErrorType, fail } from '../utils/errors'
import { createMetadata, uploadFile } from '../utils/ipfs'
import FormData from 'form-data'
import { buildTypescript, checkECSAndCLIVersions } from '../utils/moduleHelpers'
import { isTypescriptProject } from '../project/isTypescriptProject'
import { ethers } from 'ethers'
import SceneABI from '../../abi/Scene.json'

export const help = () => `
  Usage: ${chalk.bold('bld deploy [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy

    ${chalk.dim('Example:')}

    - Deploy your scene:

      ${chalk.green('$ bld deploy')}
`

export function failWithSpinner(message: string, error?: any): void {
  spinner.fail(message)
  fail(ErrorType.DEPLOY_ERROR, error)
}

export async function main(): Promise<void> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean,
    '--https': Boolean,
    '--force-upload': Boolean,
    '--yes': Boolean
  })

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']

  if (!skipVersionCheck) {
    await checkECSAndCLIVersions(workDir)
  }

  spinner.create('Building scene in production mode')
  if (!(await isTypescriptProject(workDir))) {
    failWithSpinner(
      `Please make sure that your project has a 'tsconfig.json' file.`
    )
  }

  if (!skipBuild) {
    try {
      await buildTypescript({
        workingDir: workDir,
        watch: false,
        production: true,
        silence: true
      })
      spinner.succeed('Scene built successfully')
    } catch (error) {
      const message = 'Build /scene in production mode failed'
      failWithSpinner(message, error)
    }
  } else {
    spinner.succeed()
  }

  spinner.create('Creating deployment structure')

  const bld = new Beland({
    isHttps: !!args['--https'],
    workingDir: workDir,
    forceDeploy: args['--force-upload'],
    yes: args['--yes']
  })

  const project = bld.workspace.getSingleProject()
  if (project === null) return

  // Obtain list of files to deploy
  let originalFilesToIgnore = await project.getBLDIgnore()
  if (originalFilesToIgnore === null) {
    originalFilesToIgnore = await project.writeBldIgnore()
  }
  let filesToIgnorePlusEntityJson = originalFilesToIgnore
  if (!filesToIgnorePlusEntityJson.includes('entity.json')) {
    filesToIgnorePlusEntityJson =
      filesToIgnorePlusEntityJson + '\n' + 'entity.json'
  }

  const files: IFile[] = await project.getFiles(filesToIgnorePlusEntityJson)

  const MAX_FILE_SIZE = 50 * 1e6 // 50mb
  const exceedFiles = files.filter((file) => file.size > MAX_FILE_SIZE)
  if (exceedFiles.length) {
    return failWithSpinner(
      `Cannot deploy files bigger than 50mb. Files: \n\t${exceedFiles.join(
        '\n\t'
      )}`
    )
  }

  const authIdentity = await Authenticator.initializeAuthChain(
    bld.wallet?.address as string,
    {
      address: bld.wallet?.address as string,
      privateKey: bld.wallet?.privateKey as string,
      publicKey: bld.wallet?.address as string
    },
    1,
    (msg: string): Promise<string> => {
      return bld.wallet?.signMessage(msg) as any
    }
  )

  const metadata: any = {
    type: 'scene',
    contents: []
  }

  let stt = 0
  for (const file of files) {
    stt++
    spinner.create(`Uploading (${stt}/${files.length}): ${file.path}`)
    const form = new FormData()
    form.append('file', file.content, file.path)
    const res: any = await uploadFile(form, authIdentity)
    metadata.contents.push({
      path: file.path,
      hash: res[0].hash
    })

    spinner.succeed(
      `Uploaded (${stt}/${files.length}): ${file.path}, hash: ${res[0].hash}`
    )
  }
  spinner.create(`Creating metadata`)
  const metadataResult: any = await createMetadata(metadata, authIdentity)
  spinner.succeed(
    `Create ipfs metadata file succeed: ${metadataResult.ipfs_uri}`
  )

  const provider = new ethers.providers.JsonRpcProvider(
    'https://rpc.kardiachain.io'
  )

  const wallet = bld.wallet?.connect(provider)

  spinner.create(`Deploying`)
  const contract = new ethers.Contract(
    '0x0454A95CE549807EC1427736C9eACC30c1943E94',
    SceneABI.abi,
    wallet as any
  )
  const tx = await contract.create(bld.wallet?.address, metadataResult.ipfs_uri)
  const reciept = await tx.wait()
  spinner.succeed(
    'Deploy succeed, tx hash: https://explorer.kardiachain.io/tx/' +
      reciept.transactionHash
  )
}
