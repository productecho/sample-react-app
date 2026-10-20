import type { ReactNode } from 'react'
import { buildInfo } from './buildInfo.ts'
import { loadedBundle, type LiveReading } from './liveCheck.ts'
import { changelog, version } from './release.ts'
import { POLL_SECONDS, judge, noteIsStale, useLiveCheck, type Verdict } from './useLiveCheck.ts'

const clock = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })
const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

interface Banner {
  tone: 'neutral' | 'ok' | 'warn'
  title: string
  detail: string
}

function bannerFor(verdict: Verdict, reading: LiveReading | null): Banner {
  switch (verdict) {
    case 'checking':
      return {
        tone: 'neutral',
        title: 'Checking the server…',
        detail: 'Reading /productecho-release.json, /index.html and /release-note.json with the browser cache bypassed.',
      }
    case 'current':
      return {
        tone: 'ok',
        title: 'This tab is running the live release.',
        detail: reading?.deploymentId
          ? 'The server reports the same deployment and bundle this tab started on.'
          : 'The server’s index.html names the bundle this tab is running. No deployment marker was found, which is expected off ProductEcho.',
      }
    case 'changed':
      return {
        tone: 'warn',
        title: 'The live release has changed.',
        detail: 'The server is now serving a different deployment or bundle than the one this tab loaded. Reload to switch to it.',
      }
    case 'unknown':
      return {
        tone: 'neutral',
        title: 'No release marker found.',
        detail:
          'Expected on your own machine. ProductEcho writes /productecho-release.json into every release it serves, so on the deployed site this check has something to compare.',
      }
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

export default function App() {
  const { reading, startedOn, log, checking, check } = useLiveCheck()
  const verdict = judge(reading, startedOn)
  const banner = bannerFor(verdict, reading)
  const stale = reading !== null && noteIsStale(reading)

  return (
    <main>
      <header className="masthead">
        <div>
          <h1>Release check</h1>
          <p className="lede">Is the page in this tab the release ProductEcho is serving right now?</p>
        </div>
        <span className="badge" title="Release version">
          v{version}
        </span>
      </header>

      <div className={`panel banner ${banner.tone}`} role="status">
        <div>
          <strong>{banner.title}</strong>
          <p>{banner.detail}</p>
        </div>
        {verdict === 'changed' && (
          <button type="button" className="primary" onClick={() => location.reload()}>
            Reload
          </button>
        )}
      </div>

      {stale && reading && (
        <div className="panel banner warn" role="status">
          <div>
            <strong>This browser kept an older release-note.json.</strong>
            <p>
              Its cache answered with version {reading.noteCached}; the server has {reading.noteFresh}. Files in public/
              keep the same URL from one release to the next, so the cache lifetime they were served with decides how
              long the old copy stays.
            </p>
          </div>
        </div>
      )}

      <section className="panel" aria-labelledby="tab-heading">
        <h2 id="tab-heading">This tab</h2>
        <p className="hint">Frozen into the bundle when it was built.</p>
        <dl className="facts">
          <Fact label="Version">
            <code>{version}</code>
          </Fact>
          <Fact label="Commit">
            <code>{buildInfo.commit}</code>
          </Fact>
          <Fact label="Built">
            <time dateTime={buildInfo.time.toISOString()} title={buildInfo.time.toISOString()}>
              {stamp.format(buildInfo.time)}
            </time>
          </Fact>
          <Fact label="Bundle">
            <code>{loadedBundle() ?? 'dev server'}</code>
          </Fact>
        </dl>
      </section>

      <section className="panel" aria-labelledby="live-heading">
        <h2 id="live-heading">Live now</h2>
        <p className="hint">Read from the server every {POLL_SECONDS} seconds while this tab is visible.</p>
        <dl className="facts">
          <Fact label="Deployment">
            <code>{reading?.deploymentId ?? '—'}</code>
          </Fact>
          <Fact label="Bundle">
            <code>{reading?.bundle ?? '—'}</code>
          </Fact>
          <Fact label="release-note.json">
            {reading ? (
              <>
                browser copy <code>{reading.noteCached ?? '—'}</code>, server copy <code>{reading.noteFresh ?? '—'}</code>
                {stale && <strong className="flag"> · out of date</strong>}
              </>
            ) : (
              '—'
            )}
          </Fact>
          <Fact label="Last check">{reading ? clock.format(reading.at) : '—'}</Fact>
        </dl>
        <button type="button" onClick={() => void check()} disabled={checking}>
          {checking ? 'Checking…' : 'Check now'}
        </button>
      </section>

      <section className="panel" aria-labelledby="log-heading">
        <h2 id="log-heading">Activity</h2>
        <p className="hint">What this tab has seen change since it opened, newest first.</p>
        <ul className="log">
          {log.length === 0 && <li className="empty">Nothing yet.</li>}
          {log.map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.at.toISOString()}>{clock.format(entry.at)}</time>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Release notes</h2>
        {changelog.map((entry) => (
          <article key={entry.version} className="release">
            <h3>
              {entry.version} <span>{entry.date}</span>
            </h3>
            <ul>
              {entry.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <footer>
        Sample app for <a href="https://www.productecho.com">ProductEcho Cloud</a>, built with React and Vite.
      </footer>
    </main>
  )
}
