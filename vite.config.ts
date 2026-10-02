import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFile } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    request.on('data', chunk => { body += chunk })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

const saveSelection = {
  name: 'save-selection',
  configureServer(server: { middlewares: { use: (path: string, handler: (request: IncomingMessage, response: import('node:http').ServerResponse) => void) => void } }) {
    server.middlewares.use('/api/selection', async (request, response) => {
      if (request.method !== 'POST') {
        response.statusCode = 405
        response.end('Method not allowed')
        return
      }
      try {
        const selection = JSON.parse(await readBody(request))
        if (!Array.isArray(selection.posts)) throw new Error('Invalid selection')
        await writeFile(new URL('public/selection.json', import.meta.url), `${JSON.stringify(selection, null, 2)}\n`)
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ ok: true }))
      } catch {
        response.statusCode = 400
        response.end(JSON.stringify({ ok: false }))
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), saveSelection],
  build: {
    rollupOptions: {
      input: {
        gallery: new URL('index.html', import.meta.url).pathname,
        curate: new URL('curate/index.html', import.meta.url).pathname,
      },
    },
  },
})
