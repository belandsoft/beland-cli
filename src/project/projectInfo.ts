import path from 'path'
import fs from 'fs-extra'
import { sdk } from '@beland/schemas'

export type ProjectInfo = {
  sceneId: string
  sceneType: sdk.ProjectType
}

export function getProjectInfo(workDir: string): ProjectInfo {
  const assetJsonPath = path.resolve(workDir, 'asset.json')
  if (fs.existsSync(assetJsonPath)) {
    return {
      sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
      sceneType: sdk.ProjectType.SMART_ITEM
    }
  }

  return {
    sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
    sceneType: sdk.ProjectType.SCENE
  }
}
