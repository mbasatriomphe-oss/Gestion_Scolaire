const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { EventEmitter, once } = require('node:events')
const fs = require('node:fs')
const http = require('node:http')
const { createRequire } = require('node:module')
const net = require('node:net')
const os = require('node:os')
const path = require('node:path')
const { PassThrough } = require('node:stream')
const test = require('node:test')
const vm = require('node:vm')

const projectDirectory = path.resolve(__dirname, '..')
const mainPath = path.join(projectDirectory, 'electron-main.cjs')
const requireFromMain = createRequire(mainPath)

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scolaris desktop regression-'))
  t.after(() => {
    // Only remove the directory returned by mkdtemp, never an application profile.
    assert.equal(path.dirname(directory), os.tmpdir())
    fs.rmSync(directory, { recursive: true, force: true })
  })
  return directory
}

function loadDesktop({ directory, userData, port = 0, httpModule = http, fastTimers = false }) {
  const environment = { ...process.env, SCOLARIS_API_PORT: String(port) }
  for (const key of Object.keys(environment)) {
    if (/^(APP_|DB_|LARAVEL_|VIEW_COMPILED_PATH$|SESSION_|CACHE_)/.test(key)) delete environment[key]
  }
  const app = {
    isPackaged: false,
    getPath(name) {
      assert.equal(name, 'userData')
      return userData
    },
    whenReady: () => ({ then() {} }),
    on() {},
    quit() {},
  }
  const context = vm.createContext({
    __dirname: directory,
    require(name) {
      if (name === 'electron') return { app, BrowserWindow() {}, dialog: {} }
      if (name === 'node:http') return httpModule
      return requireFromMain(name)
    },
    process: { env: environment, platform: process.platform },
    console,
    URL,
    setTimeout: fastTimers
      ? (callback, milliseconds, ...args) => setTimeout(callback, Math.min(milliseconds, 5), ...args)
      : setTimeout,
    clearTimeout,
  })
  vm.runInContext(fs.readFileSync(mainPath, 'utf8'), context, { filename: mainPath })
  return vm.runInContext(`({
    probeBackend, waitForBackend, spawnBackend, runBackendCommand,
    startBackendProcess, stopBackend, isPortAvailable, getBackendEnvironment,
    applyInstallerDatabaseSettings,
    get backendProcess() { return backendProcess },
    set backendProcess(value) { backendProcess = value },
    get backendLogStream() { return backendLogStream },
    get ownsBackendPort() { return ownsBackendPort },
    set ownsBackendPort(value) { ownsBackendPort = value }
  })`, context)
}

function fakeProcess() {
  return {
    exitCode: null,
    killed: false,
    kills: 0,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill() {
      this.killed = true
      this.kills += 1
    },
  }
}

function scriptedHttp(results) {
  let calls = 0
  return {
    get calls() { return calls },
    get(_url, options, respond) {
      assert.ok(options.timeout > 0)
      const result = results[Math.min(calls++, results.length - 1)]
      const request = new EventEmitter()
      request.destroy = (error) => request.emit('error', error)
      queueMicrotask(() => {
        if (result === 'timeout') request.emit('timeout')
        else respond({ statusCode: result, resume() {} })
      })
      return request
    },
  }
}

test('a slow health request reports a retryable timeout', async (t) => {
  const directory = temporaryDirectory(t)
  const httpModule = scriptedHttp(['timeout'])
  const desktop = loadDesktop({ directory, userData: directory, httpModule })
  await assert.rejects(desktop.probeBackend(10), { code: 'ETIMEDOUT' })
})

test('startup retries a timeout and still stops its own PHP process after readiness', async (t) => {
  const directory = temporaryDirectory(t)
  const httpModule = scriptedHttp(['timeout', 200])
  const desktop = loadDesktop({ directory, userData: directory, httpModule, fastTimers: true })
  const child = fakeProcess()
  desktop.backendProcess = child
  desktop.ownsBackendPort = true

  await desktop.waitForBackend(1000)
  assert.equal(httpModule.calls, 2)
  desktop.stopBackend()
  desktop.stopBackend()
  assert.equal(child.kills, 1, 'closing the application must stop PHP exactly once')
})

test('closing the application does not kill a backend it does not own', (t) => {
  const directory = temporaryDirectory(t)
  const desktop = loadDesktop({ directory, userData: directory })
  const child = fakeProcess()
  desktop.backendProcess = child
  desktop.stopBackend()
  assert.equal(child.kills, 0)
})

test('startup reports an exited PHP process instead of waiting for health checks', async (t) => {
  const directory = temporaryDirectory(t)
  const httpModule = scriptedHttp([200])
  const desktop = loadDesktop({ directory, userData: directory, httpModule })
  desktop.backendProcess = { ...fakeProcess(), exitCode: 1 }
  await assert.rejects(desktop.waitForBackend(1000), /PHP\/Laravel/)
  assert.equal(httpModule.calls, 0)
})

async function unusedPort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return port
}

test('real PHP supports successive Artisan commands, MySQL settings and Laravel health in an isolated profile', {
  skip: process.platform !== 'win32' ? 'The desktop package contains Windows PHP.' : false,
  timeout: 45000,
}, async (t) => {
  const phpSource = process.env.SCOLARIS_TEST_PHP_DIR || path.join(projectDirectory, 'out', 'php')
  const stagedBackend = path.join(projectDirectory, 'backend-runtime')
  assert.ok(fs.existsSync(path.join(phpSource, 'php.exe')), 'Run npm run build to prepare PHP first.')
  assert.ok(fs.existsSync(path.join(stagedBackend, 'artisan')), 'Run npm run stage:backend first.')

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'scolaris desktop regression-'))
  const directory = path.join(temporary, 'application with spaces')
  const userData = path.join(temporary, 'isolated user profile')
  const backendLink = path.join(directory, 'backend-runtime')
  const phpDirectory = path.join(directory, 'out', 'php')
  let desktop
  let child
  let logStream
  const streamErrors = []
  t.after(async () => {
    const childClosed = child && child.exitCode === null && child.signalCode === null
      ? once(child, 'close')
      : Promise.resolve()
    const logClosed = logStream && !logStream.closed ? once(logStream, 'close') : Promise.resolve()
    desktop?.stopBackend()
    await Promise.all([childClosed, logClosed])
    // Remove the junction explicitly before recursively removing the fixture.
    if (fs.existsSync(backendLink)) fs.unlinkSync(backendLink)
    assert.equal(path.dirname(temporary), os.tmpdir())
    fs.rmSync(temporary, { recursive: true, force: true })
  })

  fs.mkdirSync(directory, { recursive: true })
  // Do not hold DLLs from out/php open while another build replaces that directory.
  fs.cpSync(phpSource, phpDirectory, { recursive: true })
  fs.symlinkSync(stagedBackend, backendLink, 'junction')
  const port = await unusedPort()
  desktop = loadDesktop({ directory, userData, port })

  const appDataDirectory = path.join(userData, 'backend')
  fs.mkdirSync(appDataDirectory, { recursive: true })
  const password = '$& $$ ${APP_NAME} " \\ # space'
  fs.writeFileSync(path.join(appDataDirectory, 'installer-db.ini'), [
    'DB_HOST=127.0.0.1',
    'DB_PORT=1',
    'DB_DATABASE=desktop_regression_isolated',
    'DB_USERNAME=desktop_regression_user',
    `DB_PASSWORD=${password}`,
    '',
  ].join('\n'))
  const environmentPath = desktop.spawnBackend()
  logStream = desktop.backendLogStream
  logStream.on('error', (error) => streamErrors.push(error))

  const parsedPassword = spawnSync(path.join(phpDirectory, 'php.exe'), [
    '-c', path.join(phpDirectory, 'php.ini'),
    '-d', `extension_dir="${path.join(phpDirectory, 'ext').replace(/\\/g, '/')}"`,
    '-r', 'require $argv[1]."/vendor/autoload.php"; $values = Dotenv\\Dotenv::parse(file_get_contents($argv[2])); echo json_encode($values["DB_PASSWORD"]);',
    backendLink,
    environmentPath,
  ], { env: desktop.getBackendEnvironment(), encoding: 'utf8', windowsHide: true, timeout: 10000 })
  assert.equal(parsedPassword.status, 0, parsedPassword.stderr || parsedPassword.error?.message)
  assert.equal(JSON.parse(parsedPassword.stdout), password, 'MySQL password must survive installer and dotenv parsing')

  const modules = spawnSync(path.join(phpDirectory, 'php.exe'), [
    '-c', path.join(phpDirectory, 'php.ini'),
    '-d', `extension_dir="${path.join(phpDirectory, 'ext').replace(/\\/g, '/')}"`,
    '-r', "echo json_encode([extension_loaded('mbstring'), function_exists('mb_split')]);",
  ], { env: desktop.getBackendEnvironment(), encoding: 'utf8', windowsHide: true, timeout: 10000 })
  assert.equal(modules.status, 0, modules.stderr || modules.error?.message)
  assert.deepEqual(JSON.parse(modules.stdout), [true, true], modules.stderr)

  await desktop.runBackendCommand('--version', [])
  await desktop.runBackendCommand('--version', [])
  assert.equal(logStream.writableEnded, false, 'Artisan must not close the shared server log')

  child = desktop.startBackendProcess()
  desktop.backendProcess = child
  try {
    await desktop.waitForBackend(20000)
  } catch (error) {
    for (const filename of ['laravel-server.log', 'php-errors.log', path.join('storage', 'logs', 'laravel.log')]) {
      const logPath = path.join(appDataDirectory, filename)
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8')
        t.diagnostic(`${filename}:\n${content.slice(0, 3000)}\n${content.slice(-6000)}`)
      }
    }
    throw error
  }
  assert.equal(await desktop.probeBackend(), true)
  const compiledViews = fs.readdirSync(path.join(appDataDirectory, 'storage', 'framework', 'views'))
  assert.ok(compiledViews.some((name) => name.endsWith('.php')), '/up must successfully compile its Blade view')

  const childClosed = once(child, 'close')
  const logClosed = once(logStream, 'close')
  desktop.stopBackend()
  desktop.stopBackend()
  await Promise.all([childClosed, logClosed])
  assert.equal(await desktop.isPortAvailable(port), true, 'closing the application must release its API port')
  assert.deepEqual(streamErrors, [])
  const log = fs.readFileSync(path.join(appDataDirectory, 'laravel-server.log'), 'utf8')
  assert.equal((log.match(/Laravel Framework/g) || []).length, 2)
  assert.match(log, /Development Server/)
})
