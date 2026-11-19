import {createReadStream, readFileSync, statSync} from 'node:fs'
import {createServer} from 'node:http'
import {extname, join, resolve, sep} from 'node:path'
import {fileURLToPath} from 'node:url'

const port = Number(process.env.PORT ?? 8080)
const configuredBase = process.env.APP_BASE_PATH ?? '/'
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
if (!configuredBase.startsWith('/') || /[\\?#%]|\/{2,}/.test(configuredBase)
  || [...configuredBase].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  || configuredBase.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('Invalid APP_BASE_PATH')
const base = configuredBase.endsWith('/') ? configuredBase : configuredBase + '/'
const root = fileURLToPath(new URL('./dist', import.meta.url))
const index = join(root, 'index.html')
const evidence = JSON.parse(readFileSync(join(root, 'permission-build.json'), 'utf8'))
if (evidence.schemaVersion !== 1 || evidence.producerId !== 'yaoguang-web'
  || evidence.application?.businessCode !== 'xingyuan' || evidence.application?.applicationCode !== 'yaoguang') {
  throw new Error('A verified yaoguang-web permission build is required')
}

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
])
const isFile = path => {
  try { return statSync(path).isFile() } catch { return false }
}

const serve = (incoming, outgoing) => {
  if (incoming.method !== 'GET' && incoming.method !== 'HEAD') {
    outgoing.writeHead(405, {Allow: 'GET, HEAD'}).end()
    return
  }
  let pathname
  try { pathname = decodeURIComponent(new URL(incoming.url, 'http://local').pathname) }
  catch {
    outgoing.writeHead(400).end()
    return
  }
  if (pathname === '/healthz') {
    outgoing.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'}).end('ok')
    return
  }
  if (pathname === base.slice(0, -1)) {
    outgoing.writeHead(308, {Location: base}).end()
    return
  }
  const relative = pathname === '/favicon.png' ? 'favicon.png' : pathname.startsWith(base) ? pathname.slice(base.length) : undefined
  if (relative === undefined || relative.startsWith('/') || relative.includes('\\') || relative.includes('\0')
    || /^(api|apps)(\/|$)/.test(relative)) {
    outgoing.writeHead(404).end()
    return
  }
  const requested = resolve(root, relative)
  if (requested !== root && !requested.startsWith(root + sep)) {
    outgoing.writeHead(404).end()
    return
  }
  const applicationRoute = /^(?:auth\/(?:oidc\/(?:callback|popup)|standalone)\/[^/]+|knowledge(?:\/[^/]+(?:\/wiki\/[^/]+)?)?)\/?$/.test(relative)
  const mayUseIndex = applicationRoute || (!extname(requested) && !relative.startsWith('assets/'))
  const candidate = isFile(requested) ? requested : mayUseIndex ? index : undefined
  if (!candidate) {
    outgoing.writeHead(404).end()
    return
  }
  outgoing.writeHead(200, {
    'Cache-Control': candidate === index ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Type': contentTypes.get(extname(candidate)) ?? 'application/octet-stream',
  })
  if (incoming.method === 'HEAD') outgoing.end()
  else createReadStream(candidate).on('error', () => outgoing.destroy()).pipe(outgoing)
}

createServer(serve).listen(port, process.env.HOST ?? '0.0.0.0')
