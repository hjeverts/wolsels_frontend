# Wolsels frontend

Angular-app (Angular 22, Angular Material) voor Wolsels: wolvoorraad, mengsels met automatische
gewichtsberekening, spinresultaten (opbrengst, garendikte, twijnen, verven) en de productie van ruwe
wol door eigen dieren of per locatie.

Hoort bij [wolsels-backend](../wolsels-backend) en [wolsels-deploy](../wolsels-deploy).

## Ontwikkelen

Start eerst de backend (`dotnet run --project src/Wolsels.Api` in wolsels-backend, poort 5262), dan:

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

nginx serveert de app en stuurt `/api/` door naar `API_UPSTREAM`.
