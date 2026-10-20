/** What the server returns right now. Every read bypasses the browser cache unless its field says otherwise. */
export interface LiveReading {
  at: Date
  /** `deployment_id` in /productecho-release.json, a file ProductEcho writes into every release it serves. */
  deploymentId: string | null
  /** Entry script named by the index.html the server returns now. */
  bundle: string | null
  /** `version` in /release-note.json with the cache bypassed. */
  noteFresh: string | null
  /** `version` in /release-note.json fetched the way an <img> or <link> would be, so the cache may answer. */
  noteCached: string | null
}

const bypass: RequestInit = { cache: 'no-store' }

async function get(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await fetch(url, init)
    return res.ok ? res : null
  } catch {
    return null
  }
}

async function getJson(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  const res = await get(url, init)
  // A host that falls back to index.html for unknown paths answers 200 with HTML, which is not a JSON file.
  if (!res?.headers.get('content-type')?.includes('json')) return null
  return res.json().catch(() => null)
}

const asText = (value: unknown) => (typeof value === 'string' ? value : null)

/** Path of the hashed entry script in a document, such as /assets/index-Bx3kQ9.js. Null on the dev server. */
function entryScript(doc: Document): string | null {
  const src = doc.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src')
  return src ? new URL(src, location.origin).pathname : null
}

/** The entry script this tab was loaded with. */
export const loadedBundle = () => entryScript(document)

async function liveBundle(): Promise<string | null> {
  const res = await get('/index.html', bypass)
  if (!res) return null
  try {
    return entryScript(new DOMParser().parseFromString(await res.text(), 'text/html'))
  } catch {
    return null
  }
}

export async function readLive(): Promise<LiveReading> {
  const [marker, bundle, fresh, cached] = await Promise.all([
    getJson('/productecho-release.json', bypass),
    liveBundle(),
    getJson('/release-note.json', bypass),
    getJson('/release-note.json'),
  ])
  return {
    at: new Date(),
    deploymentId: asText(marker?.deployment_id),
    bundle,
    noteFresh: asText(fresh?.version),
    noteCached: asText(cached?.version),
  }
}
