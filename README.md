# Wolsels frontend

Angular-app (Angular 22, Angular Material) voor Wolsels: wolvoorraad, mengsels met automatische
gewichtsberekening, spinresultaten (opbrengst, garendikte, twijnen, verven) en de productie van ruwe
wol door eigen dieren of per locatie.

Hoort bij [wolsels_backend](https://github.com/hjeverts/wolsels_backend) en [wolsels_deploy](https://github.com/hjeverts/wolsels_deploy).

## Ontwikkelen

Start eerst de backend (`dotnet run --project src/Wolsels.Api` in wolsels_backend, poort 5262), dan:

```sh
npm install
npm start          # http://localhost:4200, /api wordt doorgestuurd naar :5262 (proxy.conf.json)
npm test           # unit tests (Vitest)
npm run build
```

## Schermen

| Route         | Inhoud                                                                    |
|---------------|---------------------------------------------------------------------------|
| `/voorraad`   | Wolvoorraad: naam, wolsoort, kleur (+ kleurcode), gewicht, herkomst       |
| `/mengsels`   | Mengsels met verhouding, input/output, opbrengst %, garen- en verfgegevens |
| `/productie`  | Oogsten ruwe wol, totalen per maand en per dier/locatie                   |
| `/dieren`     | Dieren (bv. angorakonijnen) met locatie en totale opbrengst               |
| `/dieren/importeren` | Dieren importeren uit CSV (kolommen koppelen, controleren, bestaande bijwerken of overslaan); export via de dierenlijst |
| `/locaties`   | Locaties; oogsten kunnen ook direct op een locatie geboekt worden         |
| `/account`    | Tweestapsverificatie (QR-code, herstelcodes) en wachtwoord wijzigen       |
| `/huishouden` | Leden, uitnodigingslinks, naam, verlaten, extra huishouden aanmaken       |
| `/uitnodiging/:token` | Uitnodiging accepteren (met of zonder account)                   |
| `/beheer`     | Gebruikersbeheer (alleen beheerders)                                      |
| `/inloggen`, `/registreren`, `/wachtwoord-vergeten`, `/wachtwoord-herstellen` | Accounts |

Alle pagina's behalve de account-pagina's vereisen een login (`authGuard`). Een verlopen sessie
(401) stuurt terug naar de inlogpagina, met daarna een terugkeer naar de oorspronkelijke pagina.

### Mengverhouding

In het mengselformulier vul je per soort wol een verhouding in (delen of procenten). Het gewichtsveld
dat je als laatste invult (het totaal óf één van de soorten) is leidend en krijgt een punaise; de
andere gewichten worden direct herberekend (`src/app/core/blend-calculator.ts`). De backend rekent
bij opslaan met dezelfde logica opnieuw. Het maximaal aantal soorten komt uit de backend
(`/api/settings`). Er verschijnt een waarschuwing als er meer wol nodig is dan op voorraad.

### Huishoudens

Het actieve huishouden staat in `localStorage` en wordt met elk API-verzoek meegestuurd als
`X-Household` (`core/household.interceptor.ts`); de backend controleert het lidmaatschap. Wisselen
herlaadt de app, zodat er nooit gegevens van een ander huishouden in beeld blijven.

### Iconen

Favicon, app-iconen (192/512, maskable) en het Apple touch icon komen uit `icons-src/` (het "gesture"-
symbool uit het logo, op de themakleur). Opnieuw genereren: `./icons-src/generate.sh`. Met
`public/manifest.webmanifest` is Wolsels op tablets en telefoons als app te installeren.

## Docker

GitHub Actions (`.github/workflows/image.yml`) draait bij elke push naar `main` de tests en zet de
image op `ghcr.io/hjeverts/wolsels-frontend` (tags `latest`, `sha-<commit>` en bij een git-tag `v1.2.3`
ook `1.2.3` en `1.2`). Elke maandag wordt hij opnieuw gebouwd voor updates van de base-image.

Zelf bouwen:

```sh
docker build -t wolsels-frontend .
docker run -p 8080:8080 -e API_UPSTREAM=http://<backend-host>:8080 wolsels-frontend
```

De container (nginx, niet-root, poort 8080) serveert de app en stuurt `/api/` door naar `API_UPSTREAM`.
`NGINX_RESOLVER` (standaard Docker-DNS `127.0.0.11`) wordt gebruikt om die hostnaam op te zoeken.
In productie staat hij achter de nginx op de server; zie
[wolsels_deploy](https://github.com/hjeverts/wolsels_deploy).

De nginx-configuratie (`nginx/default.conf.template`) zet beveiligingsheaders, waaronder een strikte
Content-Security-Policy (daarom staat het inlinen van kritieke CSS uit in `angular.json`). Het client-IP
wordt alleen van proxies op interne netwerken overgenomen, zodat de pogingslimieten van de backend niet
te omzeilen zijn met een vervalste `X-Forwarded-For`.

## Licentie

[MIT](LICENSE) © 2026 Hans Everts
