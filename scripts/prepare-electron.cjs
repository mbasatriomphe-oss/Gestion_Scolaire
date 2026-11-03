const fs = require('node:fs')
const path = require('node:path')

const projectDirectory = path.resolve(__dirname, '..')
const backendDirectory = path.join(projectDirectory, 'backend-runtime')
const exportDirectory = path.join(projectDirectory, 'out')
const phpSourceDirectory = path.join(process.env.PHP_RUNTIME_DIR || 'C:\\xampp\\php')
const phpRuntimeDirectory = path.join(exportDirectory, 'php')
const phpExtensionFiles = [
  'php_curl.dll',
  'php_fileinfo.dll',
  'php_mbstring.dll',
  'php_openssl.dll',
  'php_pdo_mysql.dll',
  'php_pdo_sqlite.dll',
  'php_sqlite3.dll',
]
const phpExtensionDependencies = {
  php_curl: ['libssh2.dll', 'nghttp2.dll', 'libssl-3-x64.dll', 'libcrypto-3-x64.dll'],
  php_openssl: ['libssl-3-x64.dll', 'libcrypto-3-x64.dll'],
}
const phpRuntimeFiles = [
  'php.exe',
  'php8ts.dll',
  'icudt71.dll',
  'icuin71.dll',
  'icuuc71.dll',
  'libcrypto-3-x64.dll',
  'libssl-3-x64.dll',
  'libsqlite3.dll',
  'license.txt',
]
const phpIniExtensions = ['curl', 'fileinfo', 'mbstring', 'openssl', 'pdo_mysql', 'pdo_sqlite', 'sqlite3']
const phpRuntimeDllFiles = [
  'icudt71.dll',
  'icuin71.dll',
  'icuio71.dll',
  'icuuc71.dll',
  'libcrypto-3-x64.dll',
  'libsodium.dll',
  'libssh2.dll',
  'libssl-3-x64.dll',
  'nghttp2.dll',
  'zlib1.dll',
]
const backendRequiredPaths = [
  'artisan',
  'bootstrap',
  'config',
  'database',
  'electron-router.php',
  'public',
  'resources',
  'routes',
  'vendor',
]
if (fs.existsSync(path.join(backendDirectory, '.env'))) {
  throw new Error('backend-runtime/.env must never be shipped. Remove it before building the installer.')
}
for (const requiredPath of backendRequiredPaths) {
  if (!fs.existsSync(path.join(backendDirectory, requiredPath))) {
    throw new Error(
      `Laravel backend is missing ${requiredPath}: ${backendDirectory}. Run npm run stage:backend first.`,
    )
  }
}

for (const requiredFile of phpRuntimeFiles) {
  if (!fs.existsSync(path.join(phpSourceDirectory, requiredFile))) {
    throw new Error(`PHP runtime is missing ${requiredFile}: ${phpSourceDirectory}`)
  }
}

for (const extension of phpExtensionFiles) {
  if (!fs.existsSync(path.join(phpSourceDirectory, 'ext', extension))) {
    throw new Error(`PHP extension is missing ${extension}: ${phpSourceDirectory}`)
  }
}
fs.rmSync(path.join(exportDirectory, 'backend'), { recursive: true, force: true })
fs.rmSync(path.join(exportDirectory, 'php'), { recursive: true, force: true })
fs.mkdirSync(path.join(phpRuntimeDirectory, 'ext'), { recursive: true })

fs.cpSync(backendDirectory, path.join(exportDirectory, 'backend'), {
  recursive: true,
  filter: (source) => {
    const relativePath = path.relative(backendDirectory, source)
    if (!relativePath) return true

    return relativePath !== '.env'
  },
})

for (const runtimeFile of phpRuntimeFiles) {
  fs.copyFileSync(path.join(phpSourceDirectory, runtimeFile), path.join(phpRuntimeDirectory, runtimeFile))
}
for (const extension of phpExtensionFiles) {
  fs.copyFileSync(
    path.join(phpSourceDirectory, 'ext', extension),
    path.join(phpRuntimeDirectory, 'ext', extension),
  )
}
for (const library of phpRuntimeDllFiles) {
  const sourcePath = path.join(phpSourceDirectory, library)
  if (fs.existsSync(sourcePath) && !fs.existsSync(path.join(phpRuntimeDirectory, library))) {
    fs.copyFileSync(sourcePath, path.join(phpRuntimeDirectory, library))
  }
}
const dependencies = new Set(
  phpExtensionFiles.flatMap((extension) => phpExtensionDependencies[path.basename(extension, '.dll')] ?? []),
)
for (const dependency of dependencies) {
  const sourcePath = path.join(phpSourceDirectory, dependency)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`PHP runtime dependency is missing ${dependency}: ${phpSourceDirectory}`)
  }
  fs.copyFileSync(sourcePath, path.join(phpRuntimeDirectory, dependency))
}
fs.writeFileSync(
  path.join(phpRuntimeDirectory, 'php.ini'),
  [
    'extension_dir=ext',
    ...phpIniExtensions.map((extension) => `extension=php_${extension}.dll`),
    'date.timezone=UTC',
    'memory_limit=256M',
    'max_execution_time=60',
    'display_errors=Off',
    'log_errors=On',
    '',
  ].join('\r\n'),
)

fs.copyFileSync(
  path.join(projectDirectory, 'electron-main.cjs'),
  path.join(exportDirectory, 'electron-main.cjs'),
)
fs.copyFileSync(
  path.join(projectDirectory, 'README.md'),
  path.join(exportDirectory, 'Guide-de-demarrage.md'),
)
fs.mkdirSync(path.join(projectDirectory, 'release'), { recursive: true })
fs.copyFileSync(
  path.join(projectDirectory, 'README.md'),
  path.join(projectDirectory, 'release', 'Guide-de-demarrage.md'),
)
fs.writeFileSync(
  path.join(exportDirectory, 'package.json'),
  JSON.stringify(
    {
      name: 'scolaris',
      version: require(path.join(projectDirectory, 'package.json')).version,
      description: 'Application de gestion scolaire Scolaris',
      author: 'Scolaris',
      main: 'electron-main.cjs',
      packageManager: 'npm@11.9.0',
      build: {
        appId: 'com.scolaris.gestion-scolaire',
        productName: 'Scolaris - Gestion scolaire',
        artifactName: 'Scolaris-Gestion-Scolaire-Setup-${version}.${ext}',
        electronVersion: '44.9.3',
        directories: {
          output: '../release',
        },
        files: ['**/*'],
        extraResources: [
          {
            from: 'backend',
            to: 'backend',
          },
          {
            from: 'php',
            to: 'php',
          },
          {
            from: 'Guide-de-demarrage.md',
            to: 'Guide-de-demarrage.md',
          },
        ],
        npmRebuild: false,
        win: {
          icon: path.join(projectDirectory, 'public', 'icon.ico'),
          target: ['nsis'],
        },
        nsis: {
          installerIcon: path.join(projectDirectory, 'public', 'icon.ico'),
          uninstallerIcon: path.join(projectDirectory, 'public', 'icon.ico'),
          include: path.join(projectDirectory, 'scripts', 'installer.nsh'),
          oneClick: false,
          runAfterFinish: true,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
        },
      },
    },
    null,
    2,
  ),
)
