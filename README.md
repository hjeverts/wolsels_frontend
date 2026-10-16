# Wolsels frontend

Angular app (Angular 22, Angular Material) for Wolsels: wool stock, blends with automatic weight
calculation, spinning results (yield, yarn weight, plying, dyeing) and the production of raw wool by your
own animals or per location.

Belongs with [wolsels_backend](https://github.com/hjeverts/wolsels_backend) and [wolsels_deploy](https://github.com/hjeverts/wolsels_deploy).

## Development

Start the backend first (`dotnet run --project src/Wolsels.Api` in wolsels_backend, port 5262), then:

```sh
npm install
npm start          # http://localhost:4200, /api is proxied to :5262 (proxy.conf.json)
npm test           # unit tests (Vitest)
npm run build
```

## Screens

The routes are Dutch, as they appear in the address bar.

| Route         | Content                                                                   |
|---------------|---------------------------------------------------------------------------|
| `/voorraad`   | Wool stock: name, wool type, colour (the dot follows the colour name, or pick one), weight, origin, up to 10 photos (resized in the browser to 1600 px, without EXIF/GPS) |
| `/mengsels`   | Blends with ratio, input/output, yield %, yarn and dye details            |
| `/productie`  | Raw wool harvests, totals per month and per animal/location               |
| `/dieren`     | Animals (e.g. Angora rabbits) with location and total yield               |
| `/dieren/importeren` | Import animals from CSV (map columns, review, update or skip existing ones); export via the animal list |
| `/locaties`   | Locations; harvests can also be recorded directly on a location           |
| `/account`    | Language, two-step verification (QR code, recovery codes) and changing the password |
| `/huishouden` | Members, invitation links, name, leaving, creating an extra household     |
| `/uitnodiging/:token` | Accept an invitation (with or without an account)                 |
| `/beheer`     | User management (administrators only)                                     |
| `/inloggen`, `/registreren`, `/wachtwoord-vergeten`, `/wachtwoord-herstellen` | Accounts |

All pages except the account pages require a login (`authGuard`). An expired session (401) goes back to
the login page, and afterwards returns to the original page.

### Blend ratio

In the blend form you enter a ratio per wool (parts or percentages). The weight field you filled in last
(the total or one of the wools) leads and gets a pin; the other weights are recalculated immediately
(`src/app/core/blend-calculator.ts`). On save the backend calculates again with the same logic. The maximum
number of wools comes from the backend (`/api/settings`). A warning appears when more wool is needed than is
in stock.

### Households

The active household is stored in `localStorage` and sent with every API request as `X-Household`
(`core/household.interceptor.ts`); the backend checks membership. Switching reloads the app, so that data of
another household never stays on screen.

### Languages

The app is available in Dutch, German, English, French, Italian, Swedish, Norwegian, Danish, Spanish,
Portuguese and Polish. The language is stored in the user profile (Account → Language) and applies on every
device; before logging in the browser language is used (otherwise English). When the language changes the app
reloads, so that dates and numbers are right too.

Texts live in `src/app/core/i18n/translations/`. `nl.ts` is the source: add a new text there first and then in
every other language; TypeScript reports an error when a language misses a key. In templates:
`{{ 'wools.add' | t }}`, with parameters `{{ 'reset.for' | t: { email } }}`; in code `t('wools.add')`.
Plural forms follow `Intl.PluralRules` (`{ one, other }`, in Polish also `few` and `many`). The API receives the
language via `Accept-Language`.

### Icons

The favicon, app icons (192/512, maskable) and the Apple touch icon come from `icons-src/` (the "gesture"
symbol from the logo, on the theme colour). Regenerate with `./icons-src/generate.sh`. With
`public/manifest.webmanifest` Wolsels can be installed as an app on tablets and phones.

## Docker

GitHub Actions (`.github/workflows/image.yml`) runs the tests on every pull request and push to `main`.
An image is only built for a version tag:

```sh
git switch main && git pull
git tag v1.2.0 && git push origin v1.2.0     # or via GitHub: Releases → Draft a new release
```

The image is published to `ghcr.io/hjeverts/wolsels-frontend` with the tags `1.2.0`, `1.2` and, if it is the
newest version, `latest`. Use [semver](https://semver.org/): `v1.2.1` for a bug fix, `v1.3.0` for a new
feature. Every Monday the newest version is rebuilt to pick up base image updates (manually:
*Actions → Image → Run workflow*).

Building it yourself:

```sh
docker build -t wolsels-frontend .
docker run -p 8080:8080 -e API_UPSTREAM=http://<backend-host>:8080 wolsels-frontend
```

The container (nginx, non-root, port 8080) serves the app and forwards `/api/` to `API_UPSTREAM`.
`NGINX_RESOLVER` (default Docker DNS `127.0.0.11`) is used to resolve that host name.
In production it sits behind the nginx on the server; see
[wolsels_deploy](https://github.com/hjeverts/wolsels_deploy).

The nginx configuration (`nginx/default.conf.template`) sets security headers, including a strict
Content-Security-Policy (which is why inlining critical CSS is turned off in `angular.json`). The client IP is
only taken from proxies on internal networks, so that the backend's attempt limits cannot be bypassed with a
forged `X-Forwarded-For`.

## License

[MIT](LICENSE) © 2026 Hans Everts
