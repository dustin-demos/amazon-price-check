import { serveDir, serveFile } from '@std/http/file-server'
import { createRequire } from 'node:module'

// Serves the built client from public/ and runs the original Netlify-style functions in-process.
// The functions live in functions/api/<name>.js and export `handler(event)` returning { statusCode, body },
// so the client's /.netlify/functions/<name> calls are routed here instead of to Netlify.

const PORT = parseInt(Deno.env.get('PORT') ?? '8080', 10)
const HOSTNAME = Deno.env.get('HOSTNAME') ?? '::'

const FUNCTION_PREFIX = '/.netlify/functions/'
const require = createRequire(import.meta.url)

// Invoke a CommonJS Netlify function by name with a minimal Netlify-style event.
const runFunction = async (name: string, url: URL): Promise<Response> => {
  const queryStringParameters = Object.fromEntries(url.searchParams)
  const fn = require(`./functions/api/${name}.js`)
  const result = await fn.handler({ queryStringParameters }, {})

  return new Response(result.body, {
    status: result.statusCode ?? 200,
    headers: { 'content-type': 'application/json' },
  })
}

Deno.serve({ port: PORT, hostname: HOSTNAME }, async (req) => {
  const url = new URL(req.url)

  if (url.pathname.startsWith(FUNCTION_PREFIX)) {
    const name = url.pathname.slice(FUNCTION_PREFIX.length)

    try {
      return await runFunction(name, url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'function failed'

      return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'content-type': 'application/json' } })
    }
  }

  const response = await serveDir(req, { fsRoot: 'public', quiet: true })

  // Single-page app: unmatched paths fall back to index.html.
  if (response.status === 404) {
    return serveFile(req, 'public/index.html')
  }

  return response
})
