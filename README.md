# Offline Game Hub — Website

This is the landing page, the playable web version, and the support and privacy pages for **Offline Game Hub**, a Chrome extension with 31 offline mini-games. It's ready to publish with GitHub Pages.

## Publish on GitHub Pages

1. Create a new **public** repository on GitHub, for example `offline-game-hub`.
2. Upload **everything in this folder** to the root of the repository, including the hidden `.nojekyll` file.
3. In the repo, go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, select branch `main`, choose folder `/ (root)`, then click **Save**.
4. After about a minute your site is live at `https://YOUR-USERNAME.github.io/offline-game-hub/`.

## ⚠️ Set your real URL (one find & replace)

The files use the placeholder address `https://YOUR-USERNAME.github.io/offline-game-hub/`. Replace **`YOUR-USERNAME`** with your GitHub username in these files:

- `index.html`, `privacy.html`, `support.html` (canonical and social-preview tags)
- `sitemap.xml`
- `robots.txt`
- `llms.txt`

If you named the repository something other than `offline-game-hub`, replace that part of the address too.

When the extension is live on the Chrome Web Store, search `index.html` for `Coming soon`, point that button's `href` to your store listing, and remove the `Coming soon` label.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | Landing page with the hero, all 31 games (click to play), screenshots, features, privacy summary and FAQ |
| `play/` | The full game hub, running in the browser. After the first visit, a service worker caches it so it works offline |
| `privacy.html` | Privacy policy (use this URL in the Chrome Web Store listing) |
| `support.html` | Support page: contact email, install steps, troubleshooting |
| `404.html` | Custom "page not found" page |
| `sitemap.xml` | Sitemap for Google Search Console |
| `robots.txt` | Lets search engines crawl the site and points them to the sitemap |
| `llms.txt` | Plain-text summary for AI assistants (ChatGPT, Claude, Perplexity…) |
| `site.webmanifest` | App manifest, so the web version can be installed like an app |
| `.nojekyll` | Tells GitHub Pages to serve the files exactly as they are |

## Updating the games

`play/` is a copy of the extension's `hub/`, `games/` and `icons/` folders. After you change the extension, copy those folders into `play/` again. The landing page reads its game list and cover art directly from `play/hub/js/core/GameRegistry.js` and `Art.js`, so it updates automatically.

If you change any game files, edit `play/sw.js` and change the `CACHE` name (for example, add `-v2` to the end). Returning visitors will then download the new files instead of using their cached copy.

## Contact

Support: **saqibsohaib48@gmail.com**
