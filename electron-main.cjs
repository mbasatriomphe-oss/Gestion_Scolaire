
const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const http = require('node:http')
const path = require('node:path')

const isDev = !app.isPackaged
const staticDirectory = path.join(__dirname, isDev ? 'out' : '.')
const packagedDirectory = process.resourcesPath || __dirname
const backendDirectory = isDev
  ? path.join(__dirname, 'backend-runtime')
  : path.join(packagedDirectory, 'backend')
const phpDirectory = isDev
  ? path.join(__dirname, 'out', 'php')
  : path.join(packagedDirectory, 'php')
const phpExecutable = path.join(phpDirectory, 'php.exe')
const backendPort = Number(process.env.SCOLARIS_API_PORT || 8000)
const backendUrl = `http://127.0.0.1:${backendPort}`
const frontendPort = Number(process.env.SCOLARIS_FRONTEND_PORT || 3210)
const appDataDirectory = path.join(app.getPath('userData'), 'backend')
const installerDatabaseSettingsPath = path.join(appDataDirectory, 'installer-db.ini')
const backendStorageDirectory = path.join(appDataDirectory, 'storage')
const backendBootstrapCache = path.join(backendStorageDirectory, 'bootstrap', 'cache')
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/x-component; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

let mainWindow
let staticServer
let backendProcess
let backendLogStream
let shuttingDown = false
let ownsBackendPort = false

function serveStaticFile(request, response) {
  let requestPath

  try {
    requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch (error) {
    response.writeHead(400).end('Invalid URL')
    return
  }

  let filePath = path.resolve(staticDirectory, `.${requestPath}`)
  const relativePath = path.relative(staticDirectory, filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    response.writeHead(403).end('Forbidden')
    return
  }

  if (!path.posix.extname(requestPath)) {
    filePath = path.join(filePath, 'index.html')
  }

  const readFile = (fileToRead, isRoutePayloadFallback = false) => {
    fs.readFile(fileToRead, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT' && requestPath.endsWith('.txt') && !isRoutePayloadFallback) {
          const routePayloadPath = path.resolve(staticDirectory, `.${requestPath.slice(0, -4)}`, 'index.txt')
          const payloadRelativePath = path.relative(staticDirectory, routePayloadPath)

          if (!payloadRelativePath.startsWith('..') && !path.isAbsolute(payloadRelativePath)) {
            readFile(routePayloadPath, true)
            return
          }
        }

        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
          console.error(`Unable to read exported page ${fileToRead}:`, error)
        }
        response.writeHead(404).end('Not found')
        return
      }

      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(fileToRead)] || 'application/octet-stream',
      })
      response.end(content)
    })
  }

  readFile(filePath)
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 360,
    minHeight: 500,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  mainWindow.loadURL(url).catch((error) => {
    console.error('Unable to load the application window:', error)
    app.quit()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function probeBackend(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${backendUrl}/up`, { timeout }, (response) => {
      response.resume()
      if (response.statusCode === 200) {
        resolve(true)
      } else {
        reject(new Error(`Le contrôle de santé de Laravel a renvoyé HTTP ${response.statusCode}.`))
      }
    })

    request.on('timeout', () => {
      const error = new Error('Délai de réponse dépassé.')
      error.code = 'ETIMEDOUT'
      request.destroy(error)
    })
    request.on('error', reject)
  })
}

async function waitForBackend(timeout = 30000) {
  const deadline = Date.now() + timeout
  let lastError

  while (Date.now() < deadline) {
    if (backendProcess && (backendProcess.exitCode !== null || backendProcess.killed)) {
      throw new Error('Le processus PHP/Laravel s’est arrêté avant de devenir disponible.')
    }

    try {
      await probeBackend(Math.max(1, Math.min(5000, deadline - Date.now())))
      return
    } catch (error) {
      lastError = error
      if (!['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)) throw error
      await wait(400)
    }
  }

  throw new Error(
    `Laravel ne répond pas après 30 secondes. ${lastError instanceof Error ? lastError.message : ''} Journal : ${path.join(appDataDirectory, 'laravel-server.log')}`,
  )
}

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false)
        return
      }
      reject(error)
    })
    server.listen(port, '127.0.0.1', () => server.close((error) => {
      if (error) reject(error)
      else resolve(true)
    }))
  })
}

function getBackendEnvironment() {
  return {
    ...process.env,
    APP_DEBUG: 'false',
    LARAVEL_STORAGE_PATH: backendStorageDirectory,
    LARAVEL_ENV_PATH: path.join(appDataDirectory, '.env'),
    LARAVEL_BOOTSTRAP_PATH: path.join(backendStorageDirectory, 'bootstrap'),
    PHP_INI_SCAN_DIR: '',
  }
}

function getPhpArguments() {
  return [
    '-c',
    path.join(phpDirectory, 'php.ini'),
    '-d',
    `extension_dir="${path.join(phpDirectory, 'ext').replace(/\\/g, '/')}"`,
    '-d',
    `error_log="${path.join(appDataDirectory, 'php-errors.log').replace(/\\/g, '/')}"`,
  ]
}

function runBackendCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      phpExecutable,
      [
        ...getPhpArguments(),
        'artisan',
        command,
        ...args,
      ],
      {
        cwd: backendDirectory,
        env: getBackendEnvironment(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    )
    const logPath = path.join(appDataDirectory, 'laravel-server.log')
    child.stdout.pipe(backendLogStream, { end: false })
    child.stderr.pipe(backendLogStream, { end: false })
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      reject(new Error(`La commande Laravel "${command}" a dépassé le délai autorisé.`))
    }, 120000)

    child.once('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(new Error(`Impossible d’exécuter la commande Laravel "${command}" : ${error.message}`))
    })
    child.once('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `La commande Laravel "${command}" a échoué (code ${code}). Consultez le journal : ${logPath}`,
          ),
        )
      }
    })
  })
}

function applyInstallerDatabaseSettings(appEnvironmentPath) {
  if (!fs.existsSync(installerDatabaseSettingsPath)) return

  const allowedKeys = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD']
  const settings = new Map()
  const lines = fs.readFileSync(installerDatabaseSettingsPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    if (!line) continue
    const separator = line.indexOf('=')
    if (separator <= 0) {
      throw new Error('Le fichier de configuration MySQL de l’installateur est invalide.')
    }

    const key = line.slice(0, separator)
    const value = line.slice(separator + 1)
    if (!allowedKeys.includes(key) || settings.has(key) || /[\r\n]/.test(value)) {
      throw new Error('Le fichier de configuration MySQL de l’installateur est invalide.')
    }
    settings.set(key, value)
  }

  for (const key of allowedKeys) {
    if (!settings.has(key)) {
      throw new Error('La configuration MySQL de l’installateur est incomplète.')
    }
  }

  const port = settings.get('DB_PORT')
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('Le port MySQL configuré par l’installateur est invalide.')
  }
  for (const key of ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME']) {
    if (!settings.get(key).trim()) {
      throw new Error('La configuration MySQL de l’installateur est incomplète.')
    }
  }

  let environment = fs.readFileSync(appEnvironmentPath, 'utf8')
  for (const key of allowedKeys) {
    const escapedValue = `"${settings
      .get(key)
      .replace(/\\/g, '\\\\')
      .replace(/\$/g, '\\$')
      .replace(/"/g, '\\"')}"`
    const entry = new RegExp(`^${key}=.*$`, 'm')
    if (entry.test(environment)) {
      environment = environment.replace(entry, () => `${key}=${escapedValue}`)
    } else {
      environment += `${environment.endsWith('\n') || !environment ? '' : '\n'}${key}=${escapedValue}\n`
    }
  }

  fs.writeFileSync(appEnvironmentPath, environment)
  fs.rmSync(installerDatabaseSettingsPath)
}

function spawnBackend() {
  if (!fs.existsSync(phpExecutable)) {
    throw new Error(`PHP est introuvable : ${phpExecutable}`)
  }
  if (!fs.existsSync(path.join(backendDirectory, 'artisan'))) {
    throw new Error(`Le backend Laravel est introuvable : ${backendDirectory}`)
  }

  for (const directory of [
    'framework/cache/data',
    'framework/sessions',
    'framework/views',
    'logs',
  ]) {
    fs.mkdirSync(path.join(backendStorageDirectory, directory), { recursive: true })
  }
  fs.mkdirSync(backendBootstrapCache, { recursive: true })

  fs.mkdirSync(appDataDirectory, { recursive: true })
  const appEnvironmentPath = path.join(appDataDirectory, '.env')
  const shippedEnvironmentPath = path.join(backendDirectory, '.env')
  const environmentTemplatePath = path.join(backendDirectory, '.env.example')

  if (!fs.existsSync(appEnvironmentPath) && fs.existsSync(environmentTemplatePath)) {
    fs.copyFileSync(environmentTemplatePath, appEnvironmentPath, fs.constants.COPYFILE_EXCL)
  }

  if (!fs.existsSync(appEnvironmentPath)) {
    throw new Error('Le modèle de configuration Laravel backend/.env.example est introuvable.')
  }

  applyInstallerDatabaseSettings(appEnvironmentPath)

  if (fs.existsSync(shippedEnvironmentPath)) {
    throw new Error('Le backend installé contient un fichier .env. Pour des raisons de sécurité, retirez-le et reconstruisez l’installateur.')
  }

  const logPath = path.join(appDataDirectory, 'laravel-server.log')
  backendLogStream = fs.createWriteStream(logPath, { flags: 'a' })
  return appEnvironmentPath
}

function startBackendProcess() {
  const child = spawn(
    phpExecutable,
    [
      ...getPhpArguments(),
      '-S',
      `127.0.0.1:${backendPort}`,
      '-t',
      'public',
      'electron-router.php',
    ],
    {
      cwd: backendDirectory,
      env: getBackendEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )

  const logPath = path.join(appDataDirectory, 'laravel-server.log')
  child.stdout.pipe(backendLogStream, { end: false })
  child.stderr.pipe(backendLogStream, { end: false })
  ownsBackendPort = true
  child.on('error', (error) => {
    console.error('Unable to launch the Laravel API:', error)
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`The Laravel API stopped unexpectedly (code=${code}, signal=${signal}).`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'Le serveur Laravel est arrêté',
        `Le serveur local s'est arrêté de manière inattendue.\n\nConsultez son journal : ${logPath}`,
      )
    }
  })

  return child
}

async function ensureBackend() {
  try {
    await probeBackend()
    return
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      throw new Error(`Le service déjà présent sur ${backendUrl} n’est pas l’API Laravel attendue.`)
    }
  }

  if (!(await isPortAvailable(backendPort))) {
    throw new Error(
      `Le port ${backendPort} est déjà utilisé par un autre service. Fermez-le puis relancez Scolaris.`,
    )
  }

  const appEnvironmentPath = spawnBackend()
  const keyValue = fs.readFileSync(appEnvironmentPath, 'utf8').match(/^APP_KEY\s*=\s*(.*)$/m)?.[1]?.trim()
  if (!keyValue || keyValue === '""' || keyValue === "''") {
    await runBackendCommand('key:generate', ['--force'])
  }
  await runBackendCommand('migrate', ['--force'])

  backendProcess = startBackendProcess()
  await waitForBackend()

  return appEnvironmentPath
}

function stopBackend() {
  if (shuttingDown) return
  shuttingDown = true
  if (ownsBackendPort && backendProcess && backendProcess.exitCode === null && !backendProcess.killed) {
    backendProcess.kill()
  }
  backendProcess?.stdout.unpipe(backendLogStream)
  backendProcess?.stderr.unpipe(backendLogStream)
  backendLogStream?.end()
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer(serveStaticFile)
    staticServer.once('error', reject)
    staticServer.listen(frontendPort, '127.0.0.1', () => {
      staticServer.removeListener('error', reject)
      const address = staticServer.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Impossible de déterminer l’adresse du serveur frontend local.'))
        return
      }
      resolve(`http://127.0.0.1:${frontendPort}`)
    })
  })
}

app.whenReady().then(async () => {
  try {
    await ensureBackend()

    if (isDev) {
      createWindow('http://localhost:3000')
      return
    }

    const frontendUrl = await startStaticServer()
    createWindow(frontendUrl)
  } catch (error) {
    console.error('Unable to start Scolaris:', error)
    const logPath = path.join(appDataDirectory, 'laravel-server.log')
    dialog.showErrorBox(
      'Impossible de démarrer Scolaris',
      `${error instanceof Error ? error.message : String(error)}\n\nVérifiez que MySQL est démarré, que la base Gestion_ecole existe et que les identifiants sont corrects dans ${path.join(appDataDirectory, '.env')}. Journal : ${logPath}`,
    )
    stopBackend()
    app.quit()
  }
})

app.on('before-quit', () => {
  staticServer?.close()
  stopBackend()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    if (isDev) {
      createWindow('http://localhost:3000')
    } else {
      const address = staticServer?.address()
      if (address && typeof address !== 'string') {
        createWindow(`http://127.0.0.1:${address.port}`)
      }
    }
  }
})
