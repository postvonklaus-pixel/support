# Kasse – PoS Web-App

Eine einfache Point-of-Sale (Kassen-) Web-App für den privaten Gebrauch – z. B. für Vereinsfeste, Kioske oder den Getränkeverkauf. Läuft komplett im Browser (kein Backend), ist als PWA installierbar und funktioniert offline.

- **Technik:** reines HTML, CSS, JavaScript – kein Framework, kein Build-Schritt
- **Speicherung:** `localStorage` (alle Daten bleiben lokal auf dem Gerät)
- **Optimiert für:** iPhone Safari (Portrait, Touch), als PWA installierbar
- **Sprache:** Deutsch

## Funktionen

- 🔒 PIN-Schutz (4-stellig, SHA-256-Hash), automatische Sperre nach 5 Minuten Inaktivität
- 🧾 Kassenansicht mit Kategorien, Produktraster und Warenkorb
- 💶 Bezahlvorgang (Bar / Karte / Sonstiges) inkl. Rückgeld-Berechnung
- 📦 Produktverwaltung (anlegen, bearbeiten, löschen) inkl. Kamerafoto oder Barcode (EAN-13/EAN-8/UPC-A/Code128/QR)
- 📊 Verkaufshistorie mit Tagesumsatz
- ⚙️ Einstellungen: Geschäftsname, Währung, PIN ändern, Export/Import (JSON), alle Daten löschen
- 📴 Offline-fähig durch Service Worker

Der **Standard-PIN** beim ersten Start ist **1234** und kann jederzeit in den Einstellungen geändert werden.

## Lokal ausprobieren

Da die App `crypto.subtle` (für das PIN-Hashing) nutzt, muss sie über `http://localhost` oder `https://` aufgerufen werden (nicht per `file://`). Am einfachsten mit einem kleinen lokalen Server:

```bash
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

## Einrichtung von GitHub Pages

1. Im Repository zu **Settings → Pages** gehen.
2. Unter **Build and deployment → Source** die Option **„GitHub Actions“** auswählen.
3. Nach dem nächsten Push auf den Branch `main` deployt der Workflow [`​.github/workflows/deploy.yml`](.github/workflows/deploy.yml) die App automatisch über `actions/deploy-pages@v4`.

Die App ist danach erreichbar unter:

```
https://postvonklaus-pixel.github.io/support/
```

(Die genaue URL wird nach dem ersten erfolgreichen Deployment auch im Actions-Log und unter Settings → Pages angezeigt.)

## Updates veröffentlichen

Jeder Push auf `main` löst automatisch ein neues Deployment aus:

```bash
git add .
git commit -m "Kurze Beschreibung der Änderung"
git push origin main
```

Der Workflow läuft dann unter dem Reiter **Actions** im Repository – nach ein bis zwei Minuten ist die aktualisierte Version live.

## Als App auf dem iPhone installieren

1. Die Live-URL in **Safari** öffnen.
2. Auf das **Teilen-Symbol** tippen.
3. **„Zum Home-Bildschirm“** auswählen.
4. Die App startet danach im Vollbild-Modus (ohne Browser-Leiste) und funktioniert auch offline.

## Dateistruktur

```
/index.html               Grundgerüst & Navigation
/style.css                Mobile-First Styling, Dark Mode
/app.js                   Datenmodell, Logik, PIN, Kasse, Historie, Einstellungen
/manifest.json            PWA-Manifest
/service-worker.js        Offline-Caching
/icon-192.png, icon-512.png  App-Icons
/.github/workflows/deploy.yml  GitHub Actions Deployment nach GitHub Pages
```

## Daten & Datenschutz

Alle Daten (Produkte, Verkäufe, Einstellungen, PIN-Hash) werden ausschließlich lokal im `localStorage` des Browsers gespeichert. Es gibt keinen Server und keine Übertragung an Dritte. Über **Einstellungen → Export** lässt sich jederzeit ein JSON-Backup erstellen, über **Import** wieder einspielen.
