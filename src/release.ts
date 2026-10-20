// The file to edit when you cut a release: raise `version`, add an entry at the top of `changelog`,
// and set the same version in public/release-note.json.

export const version = '1.1.0'

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-10-20',
    changes: [
      'Second release, made to check that a new release reaches an open tab and a new visitor.',
      'Accent colour changed from teal to blue in both colour schemes.',
      'public/release-note.json now says 1.1.0.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-20',
    changes: [
      'First release: a React 19 and Vite single-page app, built from GitHub and served by ProductEcho Cloud.',
      'Compares the release in this tab with the release the server is serving right now.',
    ],
  },
]
