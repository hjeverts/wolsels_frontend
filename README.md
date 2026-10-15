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
| `/locaties`   | Locaties; oogsten kunnen ook direct op een locatie geboekt worden         |
| `/account`    | Tweestapsverificatie (QR-code, herstelcodes) en wachtwoord wijzigen       |
| `/inloggen`, `/registreren`, `/wachtwoord-vergeten`, `/wachtwoord-herstellen` | Accounts |

Alle pagina's behalve de account-pagina's vereisen een login (`authGuard`). Een verlopen sessie
(401) stuurt terug naar de inlogpagina, met daarna een terugkeer naar de oorspronkelijke pagina.

### Mengverhouding

In het mengselformulier vul je per soort wol een verhouding in (delen of procenten). Het gewichtsveld
dat je als laatste invult (het totaal óf één van de soorten) is leidend en krijgt een punaise; de
andere gewichten worden direct herberekend (`src/app/core/blend-calculator.ts`). De backend rekent
bij opslaan met dezelfde logica opnieuw. Het maximaal aantal soorten komt uit de backend
(`/api/settings`). Er verschijnt een waarschuwing als er meer wol nodig is dan op voorraad.

## Docker

```sh
docker build -t wolsels-frontend .
docker run -p 8080:80 -e API_UPSTREAM=http://<backend-host>:8080 wolsels-frontend
```

De nginx-configuratie zet beveiligingsheaders, waaronder een strikte Content-Security-Policy
(daarom staat het inlinen van kritieke CSS uit in `angular.json`). Het client-IP wordt alleen van
proxies op interne netwerken overgenomen, zodat de pogingslimieten van de backend niet te omzeilen
zijn met een vervalste `X-Forwarded-For`.

nginx serveert de app en stuurt `/api/` door naar `API_UPSTREAM`. `NGINX_RESOLVER` (standaard Docker-DNS
`127.0.0.11`) wordt gebruikt om die hostnaam op te zoeken; buiten Docker zet je hier je eigen DNS-server.
