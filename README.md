# React release check

A small React 19 and Vite single-page app, built to be deployed on **ProductEcho Cloud** from a GitHub link. It exists to answer one question: when you redeploy, does the new release reach visitors with no stale cache in the way?

The page shows which release is running in your browser tab and which release the server is serving right now. When you redeploy, an open tab notices on its own.

| | |
|---|---|
| Cloud provider | [ProductEcho Cloud](https://www.productecho.com) |
| Service | Static web app, served from ProductEcho's CDN |
| Source | A GitHub repository |
| Build | `npm ci`, then `npm run build`, on Node 22 |
| Output | `dist/` |
| Address | `https://<prefix>.cdn.productecho.com`, with a prefix you choose |

## What the page shows

- **This tab**: version, commit, build time and bundle file name, frozen into the JavaScript when it was built.
- **Live now**: what the server returns at this moment, read every 15 seconds with the browser cache bypassed. That is the deployment id from `/productecho-release.json`, the bundle named by `/index.html`, and `/release-note.json`.
- **Banner**: "This tab is running the live release", or, when the server has moved on, "The live release has changed" with a Reload button.
- **Activity**: a timestamped list of what this tab has seen change, so you can measure how long a release took to arrive.

`/productecho-release.json` is a small file ProductEcho publishes with every static release. It holds the id of the deployment that is serving the site. When it is missing, on your own machine for example, the page compares bundle names only.

## Run it locally

```bash
nvm use            # Node 22, the same as the ProductEcho build (20.19+ or 22.12+ works)
npm install
npm run dev        # http://localhost:5173 with hot reload
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/ on http://localhost:4173
```

There is no release marker locally, so the dev page reports "No release marker found" and the preview page compares bundle names only. Both are expected.

## Deploy on ProductEcho Cloud from a GitHub link

1. Push this folder to a GitHub repository, with `package.json` and `package-lock.json` at the repository root.
2. Sign in to the [ProductEcho console](https://app.productecho.com).
3. On the **Applications** page choose **Deploy static web app**.
4. Under **Source** choose **GitHub**, paste the repository address, for example `https://github.com/<account>/<repo>`, and press Enter.
5. If the console says **ProductEcho GitHub App Access Required**, choose **Install / Grant Access**, allow the repository in the GitHub window and come back.
6. Choose the branch under **Git Branch to Track** (`main`), enter a short address prefix and start the deploy.

ProductEcho inspects the repository first and recognises a Vite app as a static site. Nothing needs configuring: no port, no environment variables, build command `npm run build`, output directory `dist`. The status moves through Queued, Building and Deploying to Ready, and the app is served at `https://<prefix>.cdn.productecho.com`.

**Continuous Git Sync & Deploy** is on by default, so every push to the tracked branch rebuilds and redeploys. To redeploy by hand, press **Redeploy** on the Applications page (or **Redeploy latest** on the app's Source card) and confirm.

You can also ask your agent:

```text
Deploy github.com/<account>/<repo> (branch main) to ProductEcho as a static site and give me the live HTTPS URL.
```

A private repository needs the ProductEcho GitHub App installed on it first. More in [Deploy a GitHub repo and rebuild it on every push](https://www.productecho.com/blog/integrations/github).

## Test that a new release propagates

1. Open the deployed address and leave the tab open. Note the **Version**, **Commit**, **Built** time, **Bundle** and **Deployment**.
2. Make a change that touches each kind of file, then push it to the tracked branch (or press Redeploy latest):
   - `src/release.ts`: raise `version` and add a changelog entry. This changes the JavaScript bundle.
   - `src/index.css`: change `--accent` in both colour schemes. This changes the CSS bundle.
   - `public/release-note.json`: set the same version. This is a plain file whose URL never changes.
3. Watch the open tab while the console status goes Building, Deploying, Ready. About 15 seconds after the new release goes live the banner changes to **The live release has changed**, and **Activity** records the time. Compare it with the time the console shows Ready. Polling pauses while the tab is in the background and runs again as soon as you switch back.
4. Press **Reload**. Version, Commit, Built and Bundle must now be the new ones, and the accent colour must have changed.
5. Open the address in a private window as a control. A visitor with an empty cache must see the newest release straight away.

Redeploying without a code change is a test too. Every build embeds its build time, so a rebuild of the same commit still produces a new bundle.

### Reading the result

| You see | It means |
|---|---|
| The banner changes, and Reload shows the new version, commit and accent colour | `index.html`, the JavaScript bundle and the CSS reached the browser |
| The console says Ready but the open tab never reports a change | The browser is still being served the old release. Note the time and check the headers below |
| "This browser kept an older release-note.json" | A file whose URL does not change was answered from the browser cache. Files in `public/` keep their URL from one release to the next, so the cache lifetime they were served with decides how long the old copy stays. Give such files a content hash by importing them from `src/`, or put a version in their URL |
| Commit shows `unknown` | The source did not come from a git checkout, for example a zip upload |

### Check the headers yourself

```bash
URL=https://<prefix>.cdn.productecho.com
curl -sI "$URL/"                         | grep -iE '^(HTTP|cache-control|etag|age|x-cache)'
curl -sI "$URL/productecho-release.json" | grep -iE '^(HTTP|cache-control|age|x-cache)'
curl -sI "$URL/release-note.json"        | grep -iE '^(HTTP|cache-control|age|x-cache)'
JS=$(curl -s "$URL/" | grep -o '/assets/index-[^"]*\.js')
curl -sI "$URL$JS"                       | grep -iE '^(HTTP|cache-control|age|x-cache)'
```

`cache-control` shows how long a browser may keep each file. `age` and `x-cache` show whether the CDN answered from its cache.

## Project layout

```text
index.html               entry page; Vite writes the hashed bundle names into it at build time
vite.config.ts           bakes the build time and the git commit into the bundle
public/
  release-note.json      plain file, copied as it is (no content hash in its name)
  favicon.svg
src/
  release.ts             the file to edit to cut a release: version and changelog
  liveCheck.ts           reads the server with the cache bypassed
  useLiveCheck.ts        polling, comparison and the activity log
  App.tsx, index.css     the page
```

## Troubleshooting

- **The build fails with `tsc: not found`.** A build environment variable `NODE_ENV=production` makes npm skip devDependencies, which include TypeScript and Vite. Remove it from the app's environment variables.
- **Blank page, or assets return 404.** Do not set `base` in `vite.config.ts`. The app is served from the root of its own address, and a GitHub Pages style `base` makes the page ask for files in a folder that does not exist there.
- **`npm ci` fails.** `package.json` and `package-lock.json` are out of sync. Run `npm install` locally and commit both.
