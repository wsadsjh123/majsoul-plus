import { app, ipcMain, dialog } from 'electron'
import * as os from 'os'
import * as path from 'path'
import { UserConfigs } from './config'
import { LoadExtension } from './extension/extension'
import { Global, InitGlobal, Logger } from './global'
import { LoadResourcePack } from './resourcepack/resourcepack'
import { httpServer, httpsServer, LoadServer } from './server'
import { LoadTool } from './tool/tool'
import bossKey from './utilities/bossKey'
import openFile from './utilities/openFile'
import sandbox from './utilities/sandbox'
import screenshot from './utilities/screenshot'
import { initGameWindow, GameWindow } from './windows/game'
import { initManagerWindow, ManagerWindow } from './windows/manager'
import { initToolManager } from './windows/tool'
import { initPlayer } from './windows/audioPlayer'
import i18n from './i18n'

// 初始化全局变量
InitGlobal()

// 加载资源包
LoadResourcePack()

// 加载扩展
LoadExtension()

// 加载工具
LoadTool()

// 代理设置
if (UserConfigs.chromium.proxyUrl !== '') {
  app.commandLine.appendSwitch('proxy-server', UserConfigs.chromium.proxyUrl)
}

// 禁用/启用进程内 GPU 处理
if (UserConfigs.chromium.isInProcessGpuOn) {
  const osplatform = os.platform()
  switch (osplatform) {
    case 'darwin':
    case 'win32':
      app.commandLine.appendSwitch('in-process-gpu')
      break
    case 'aix':
    case 'android':
    case 'cygwin':
    case 'freebsd':
    case 'openbsd':
    case 'sunos':
    default:
      break
  }
}

// 忽略 GPU 黑名单
if (UserConfigs.chromium.isIgnoreGpuBlacklist) {
  app.commandLine.appendArgument('ignore-gpu-blacklist')
}

// 禁用 / 启用 硬件加速
if (UserConfigs.chromium.isHardwareAccelerationDisable) {
  app.disableHardwareAcceleration()
}

// Disable certificate validation TLS connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 忽略证书错误
// app.commandLine.appendSwitch('ignore-certificate-errors')

// 允许自动播放音视频
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// 当全部窗口退出后，结束进程
app.on('window-all-closed', app.quit)

// 阻止证书验证
app.on(
  'certificate-error',
  (event, webContents, url, error, certificate, callback) => {
    if (
      certificate.fingerprint ===
      // 祖传本地证书
      'sha256/UMNIGcBbbIcru/0L2e1idl+aQS7PUHqsZDcrETqdMsc='
    ) {
      event.preventDefault()
      callback(true)
    } else {
      callback(false)
    }
  }
)

const shouldQuit = app.makeSingleInstance((argv, directory) => {
  if (ManagerWindow && !ManagerWindow.isDestroyed()) {
    // ManagerWindow Mode
    if (argv.length > 2 + Number(process.env.NODE_ENV === 'development')) {
      const upath = path.resolve(
        process.argv[1 + Number(process.env.NODE_ENV === 'development')]
      )
      openFile.setPath(upath)
      openFile.register()
      ManagerWindow.webContents.send('refresh-all')
    }
  } else {
    // GameWindow Mode
    if (argv.length > 2 + Number(process.env.NODE_ENV === 'development')) {
      dialog.showMessageBox(GameWindow, {
        type: 'info',
        title: i18n.text.main.programName(),
        // TODO: i18n
        message: '游戏界面中无法导入雀魂 Plus 拓展!',
        buttons: ['OK']
      })
    }
  }
})

if (shouldQuit) {
  app.quit()
  process.exit(0)
}

app.on('will-finish-launching', () => {
  // macOS open-file
  app.on('open-file', (event, path) => {
    event.preventDefault()
    openFile.setPath(path)
    openFile.register()
  })
})

app.on('ready', () => {
  // 资源管理器通知启动游戏
  ipcMain.on('start-game', () => {
    // 加载服务器路由规则
    LoadServer()

    // 初始化本地镜像服务器，当端口被占用时会随机占用另一个端口
    if (UserConfigs.userData.useHttpServer) {
      httpServer.listen(Global.ServerPort)
      httpServer.on('error', err => {
        // TODO: 验证 http 端口冲突时的提示信息是否是下面的内容
        if (err.name === 'EADDRINUSE') {
          httpServer.close()
          // 随机监听一个空闲端口
          httpServer.listen(0)
        }
      })
    } else {
      httpsServer.listen(Global.ServerPort)
      httpsServer.on('error', err => {
        if (err.code === 'EADDRINUSE') {
          httpsServer.close()
          // 随机监听一个空闲端口
          httpsServer.listen(0)
        }
      })
    }

    if (!process.env.SERVER_ONLY) {
      // 初始化游戏窗口
      initGameWindow()
    } else {
      // 通过 audioPlayer 窗口阻止程序退出
      initPlayer()
    }

    // 根据设置决定销毁 / 隐藏 Manager 窗口
    if (UserConfigs.window.isManagerHide) {
      ManagerWindow.hide()
    } else {
      ManagerWindow.close()
    }
  })

  bossKey.register() // 注册老板键功能
  screenshot.register() // 注册截图功能
  sandbox.register() // 注册工具窗口的沙盒功能

  if (process.platform !== 'darwin') {
    openFile.register() // 注册文件打开导入拓展功能
  }

  // 初始化扩展资源管理器窗口
  initManagerWindow()
  initToolManager()
})

// 监听 GPU 进程崩溃事件
app.on('gpu-process-crashed', (event, killed) => {
  Logger.error(`gpu-process-crashed: ${killed}`)
})

// uncaught exception
process.on('uncaughtException', err => {
  Logger.error(`uncaughtException ${err.name}: ${err.message}`)
})