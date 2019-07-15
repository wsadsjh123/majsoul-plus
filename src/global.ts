import { app } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { ConsoleLogger } from './logger'
import { MajsoulPlus } from './majsoul_plus'

// tslint:disable-next-line
export const Logger = new ConsoleLogger('Majsoul_Plus')

/**
 * 应用保存数据的路径
 */
export const appDataDir: string = ((): string => {
  const localData = path.resolve(
    process.env.NODE_ENV === 'development'
      ? path.resolve(__dirname, '..')
      : path.resolve(app.getAppPath(), '../..'),
    'data'
  )
  const appData = app.getPath('userData')
  if (fs.existsSync(localData) && fs.statSync(localData).isDirectory()) {
    return localData
  } else {
    if (!fs.existsSync(appData)) {
      fs.mkdirSync(appData)
    }
    return appData
  }
})()

/**
 * 应用图标
 * //TODO: 修改图标路径 减少目录层级
 */
export const appIcon: string = (() => {
  switch (os.platform()) {
    case 'win32':
      return path.join(__dirname, 'bin', 'icons/icon.ico')
    case 'darwin':
      return path.join(__dirname, 'bin', 'icons/icon.icns')
    default:
      return path.join(__dirname, 'bin', 'icons/icon.png')
  }
})()

// tslint:disable-next-line
export const GlobalPath: MajsoulPlus.GlobalPath = {
  LocalDir: '/static',
  ResourcePackDir: 'resourcepack',
  ExtensionDir: 'extension',
  ToolsDir: 'tool'
}

// tslint:disable-next-line
export const RemoteDomains = [
  { id: 0, name: 'zh', domain: 'https://majsoul.union-game.com/0/' },
  { id: 1, name: 'jp', domain: 'https://game.mahjongsoul.com/' },
  { id: 2, name: 'en', domain: 'https://mahjongsoul.game.yo-star.com/' }
]

// tslint:disable-next-line
export const Global: MajsoulPlus.Global = {
  version: app.getVersion(),
  ServerPort: 8887,
  XOR_KEY: 73,
  EXTEND_RES_KEYWORD: 'extendRes',
  ResourcePackConfigPath: '',
  ExtensionConfigPath: '',
  ToolConfigPath: '',
  UserConfigPath: path.join(appDataDir, 'Configs-user.json'),
  LocalCachePath: path.join(appDataDir, GlobalPath.LocalDir),
  ResourceFolderPath: path.join(appDataDir, GlobalPath.ResourcePackDir),
  ExtensionFolderPath: path.join(appDataDir, GlobalPath.ExtensionDir),
  ToolFolderPath: path.join(appDataDir, GlobalPath.ToolsDir),

  GameWindowConfig: {
    width: 1280 + 16,
    height: 720 + 39,
    frame: true,
    resizable: true,
    backgroundColor: '#000000',
    webPreferences: {
      // webSecurity: false
      // nodeIntegration: false
      // plugins: true
    },
    autoHideMenuBar: true,
    // useContentSize: true,
    icon: appIcon,
    show: true,
    enableLargerThanScreen: true
  },
  ManagerWindowConfig: {
    width: 1280, // + 16,
    height: 720, // + 39,
    frame: false,
    resizable: false,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      webSecurity: false
      // allowRunningInsecureContent: true
    },
    title: '雀魂Plus',
    autoHideMenuBar: true,
    icon: appIcon,
    maximizable: false,
    fullscreenable: false,
    show: false
  },
  ToolWindowConfig: {
    width: 960, // + 16,
    height: 540, // + 39,
    frame: true,
    resizable: false,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    autoHideMenuBar: true,
    icon: appIcon,
    maximizable: false,
    fullscreenable: false,
    useContentSize: true
  },
  HttpGetUserAgent: `Mozilla/5.0 (${os.type()} ${os.release()}; ${os.arch()}) MajsoulPlus/${app.getVersion()} Chrome/${
    process.versions.chrome
  }`
}

export function InitGlobal() {
  [
    Global.ResourcePackConfigPath,
    Global.ExtensionConfigPath,
    Global.ToolConfigPath
  ] = [
    GlobalPath.ResourcePackDir,
    GlobalPath.ExtensionDir,
    GlobalPath.ToolsDir
  ].map(dir => {
    const folder = path.join(appDataDir, dir)
    // 通过 require 避免在 renderer 中引入 utils
    // utils 存在只能在主进程调用的方法
    if (!fs.existsSync(folder) && app) {
      require('./utils').copyFolderSync(
        path.join(__dirname, 'bin', dir),
        appDataDir
      )
    }
    return path.join(folder, 'active.json')
  })
}
