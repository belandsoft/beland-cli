import path from 'path'

import { readJSON, writeJSON, getUserHome } from './utils/filesystem'
import { removeEmptyKeys } from './utils'

export type BLDInfo = {
  api?: string
}

let networkFlag: string
let config: BLDInfo

/**
 * Returns the path to the `.bldinfo` file located in the local HOME folder
 */
function getBLDInfoPath(): string {
  return path.resolve(getUserHome(), '.bldinfo')
}

/**
 * Reads the contents of the `.bldinfo` file
 */
async function readBLDInfo(): Promise<BLDInfo | null> {
  const filePath = getBLDInfoPath()
  try {
    const file = await readJSON<BLDInfo>(filePath)
    return file
  } catch (e) {
    return null
  }
}

/**
 * Creates the `.bldinfo` file in the HOME directory
 */
export function createBLDInfo(info: BLDInfo) {
  config = info
  return writeJSON(getBLDInfoPath(), info)
}

/**
 * Add new configuration to `.bldinfo` file
 */
export async function writBLDInfo(newInfo: BLDInfo) {
  return writeJSON(getBLDInfoPath(), { ...config, newInfo })
}

/**
 * Reads `.bldinfo` file and loads it in-memory to be sync-obtained with `getBLDInfo()` function
 */
export async function loadConfig(network: string): Promise<BLDInfo> {
  networkFlag = network
  config = (await readBLDInfo())!
  return config
}

/**
 * Returns the contents of the `.bldinfo` file. It needs to be loaded first with `loadConfig()` function
 */
export function getBLDInfo(): BLDInfo {
  return config
}

export function getConfig(_network: string = networkFlag): BLDInfo {
  const envConfig = getEnvConfig()
  const config = {
    ...envConfig
  } as BLDInfo
  return config
}

export function getCustomConfig(): Partial<BLDInfo> {
  const envConfig = getEnvConfig()
  return { ...envConfig }
}

function getEnvConfig(): Partial<BLDInfo> {
  const { API } = process.env

  const envConfig = {
    API: API
  }

  return removeEmptyKeys(envConfig)
}
