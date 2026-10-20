import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Commit id stored in one .git folder, or null. Reads the files because the build image has no git binary. */
function commitIn(gitDir: string): string | null {
  try {
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim()
    if (!head.startsWith('ref: ')) return head // detached HEAD holds the id itself
    const ref = head.slice('ref: '.length)
    const loose = join(gitDir, ref)
    if (existsSync(loose)) return readFileSync(loose, 'utf8').trim()
    const packed = readFileSync(join(gitDir, 'packed-refs'), 'utf8')
    return packed.split('\n').find((line) => line.endsWith(` ${ref}`))?.split(' ')[0] ?? null
  } catch {
    return null
  }
}

/** Short id of the checked-out commit. Walks upwards because the app may sit in a sub-folder of a repository. */
function currentCommit(): string {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const commit = commitIn(join(dir, '.git'))
    if (commit) return commit.slice(0, 7)
    if (dirname(dir) === dir) return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Frozen into the bundle at build time, so every build is distinguishable even when the source is unchanged.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(currentCommit()),
  },
})
