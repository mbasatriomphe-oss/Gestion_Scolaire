const fs = require('node:fs')
const path = require('node:path')

const projectDirectory = path.resolve(__dirname, '..')
const sourceDirectory = path.resolve(projectDirectory, '..', 'Projet-scolors-client-Bunia')
const stagingDirectory = path.join(projectDirectory, 'backend-runtime')

const requiredPaths = [
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
const excludedPaths = [
  '.git',
  '.phpunit.result.cache',
  'node_modules',
  'storage',
  'tests',
  'docs',
  'script.sql',
  'phpunit.xml',
  'README.md',
  path.join('bootstrap', 'cache'),
]

for (const requiredPath of requiredPaths) {
  if (!fs.existsSync(path.join(sourceDirectory, requiredPath))) {
    throw new Error(`Laravel backend is missing ${requiredPath}: ${sourceDirectory}`)
  }
}

fs.rmSync(stagingDirectory, { recursive: true, force: true })
fs.mkdirSync(stagingDirectory, { recursive: true })
fs.cpSync(sourceDirectory, stagingDirectory, {
  recursive: true,
  filter: (source) => {
    const relativePath = path.relative(sourceDirectory, source)
    if (!relativePath) return true
    const segments = relativePath.split(path.sep)
    if (segments.some((segment) => segment === '.env' || (segment.startsWith('.env.') && segment !== '.env.example'))) {
      return false
    }

    return !excludedPaths.some(
      (excluded) => relativePath === excluded || relativePath.startsWith(`${excluded}${path.sep}`),
    )
  },
})
fs.writeFileSync(path.join(stagingDirectory, '.gitkeep'), '')

fs.copyFileSync(
  path.join(projectDirectory, 'config', 'desktop.env.example'),
  path.join(stagingDirectory, '.env.example'),
)

console.log(`Staged Laravel backend without local secrets: ${stagingDirectory}`)
