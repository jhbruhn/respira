import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import tailwindcss from '@tailwindcss/vite'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import type { Plugin } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const appVersion = packageJson.version

const PYODIDE_EXCLUDE = [
  '!**/*.{md,html}',
  '!**/*.d.ts',
  '!**/node_modules',
]

export function viteStaticCopyPyodide() {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve('pyodide')))
  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, '*').replace(/\\/g, '/')].concat(PYODIDE_EXCLUDE),
        dest: 'assets',
      },
    ],
  })
}

interface PyPIPackage {
  package: string
  version: string
}

interface WheelData {
  filename: string
  buffer: Buffer
}

async function getPyPIWheelUrl(packageName: string, version: string): Promise<{ url: string; filename: string }> {
  const pypiUrl = `https://pypi.org/pypi/${packageName}/${version}/json`

  const response = await fetch(pypiUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch PyPI metadata: ${response.statusText}`)
  }

  const data = await response.json() as {
    urls: Array<{
      packagetype: string
      filename: string
      url: string
    }>
  }

  // Find the wheel file (.whl) for py3-none-any
  const wheelFile = data.urls.find((file) =>
    file.packagetype === 'bdist_wheel' &&
    file.filename.endsWith('-py3-none-any.whl')
  )

  if (!wheelFile) {
    throw new Error(`No py3-none-any wheel found for ${packageName} ${version}`)
  }

  return {
    url: wheelFile.url,
    filename: wheelFile.filename,
  }
}

export function downloadPyPIWheels(packages: PyPIPackage[]): Plugin {
  const wheels: WheelData[] = []

  return {
    name: 'download-pypi-wheels',
    async buildStart() {
      try {
        // Download all wheels in parallel
        const downloadPromises = packages.map(async ({ package: packageName, version }) => {
          console.log(`[download-pypi-wheels] Downloading ${packageName}@${version} from PyPI...`)

          // Get wheel info from PyPI
          const { url, filename } = await getPyPIWheelUrl(packageName, version)

          // Download the wheel file
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to download ${filename}: ${response.statusText}`)
          }

          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          console.log(`[download-pypi-wheels] Successfully downloaded ${filename}`)

          return { filename, buffer }
        })

        const downloadedWheels = await Promise.all(downloadPromises)
        wheels.push(...downloadedWheels)
      } catch (error) {
        console.error(`[download-pypi-wheels] Error downloading wheels:`, error)
        throw error
      }
    },
    configureServer(server) {
      // Serve wheel files during dev mode
      server.middlewares.use((req, res, next) => {
        const wheel = wheels.find((w) => req.url === `/${w.filename}`)
        if (wheel) {
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', wheel.buffer.length)
          res.end(wheel.buffer)
          return
        }
        next()
      })
    },
    async generateBundle() {
      if (wheels.length === 0) {
        throw new Error('No wheel files were downloaded')
      }

      // Add all wheel files as assets to the bundle
      for (const wheel of wheels) {
        this.emitFile({
          type: 'asset',
          fileName: wheel.filename,
          source: wheel.buffer,
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    downloadPyPIWheels([
      { package: 'pystitch', version: '1.0.0' },
    ]),
    viteStaticCopyPyodide(),
  ],
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // Mark all dev server resources as same-origin
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  },
})
