# Kasse – PoS Web-App

Eine Point-of-Sale (Kassen-) Web-App mit Lagerverwaltung und Statistik für den privaten Gebrauch – z. B. für Vereinsfeste, Kioske oder den Getränkeverkauf. Läuft komplett im Browser (kein Backend), ist als PWA installierbar und funktioniert offline.

- **Technik:** reines HTML, CSS, JavaScript (ES-Module) – kein Framework, kein Build-Schritt
- **Speicherung:** native `IndexedDB` (alle Daten bleiben lokal auf dem Gerät)
- **Optimiert für:** iPhone Safari (Portrait, Touch), als PWA installierbar
- **Sprache:** Deutsch

## Funktionen

- 🔒 PIN-Schutz (4-stellig, SHA-256-Hash), automatische Sperre nach 5 Minuten Inaktivität
- 🧾 Kassenansicht mit Kategorien, Produktraster und Warenkorb (ausverkaufte Produkte werden automatisch ausgegraut)
- 💶 Bezahlvorgang (Bar / Karte / Sonstiges) inkl. Rückgeld-Berechnung
- 📦 Produktverwaltung (anlegen, bearbeiten, löschen) inkl. Kamerafoto oder Barcode (EAN-13/EAN-8/UPC-A/Code128/QR)
- 🏷️ **Lagerverwaltung**: Bestand & Mindestbestand je Produkt, automatische Abbuchung bei Verkauf
  - **Wareneingang** / **Warenausgang** (mehrere Positionen auf einmal, mit Notiz)
  - **Inventur** mit Soll/Ist-Abgleich und farblicher Abweichungs-Markierung
  - **Bewegungsverlauf** aller Bestandsänderungen (Filter nach Produkt, Typ, Zeitraum)
  - **Bestellliste** für alle Produkte unter Mindestbestand, inkl. „Als Text teilen“
- 📊 Verkaufshistorie mit Tagesumsatz und Detailansicht (inkl. betroffener Bestandsbuchungen)
- 📈 **Statistik**: Umsatz nach Zeitraum, Top-10-Produkte (Umsatz & Menge), Umsatz pro Kategorie, Verkäufe der letzten 14 Tage, Zahlungsarten-Verteilung und Lagerwert-Übersicht – alles als reine CSS-Diagramme, ohne externe Chart-Bibliothek
- ⚙️ Einstellungen: Geschäftsname, Währung, Lagerverwaltung an/aus, PIN ändern, Bestände neu berechnen, Export/Import (JSON), alle Daten löschen
- 📴 Offline-fähig durch Service Worker

Der **Standard-PIN** beim ersten Start ist **1234** und kann jederzeit in den Einstellungen geändert werden.

## Datenmigration von der Vorversion

Diese Version ersetzt `localStorage` durch `IndexedDB`, da Produktfotos, Verkaufshistorie und Lagerbewegungen zusammen das 5-MB-Limit von `localStorage` in Safari sprengen können. Beim ersten Start nach dem Update werden vorhandene `localStorage`-Daten (Produkte, Verkäufe, Einstellungen, PIN) automatisch nach IndexedDB übernommen – ein Hinweis erscheint direkt nach dem Start. Die alten `localStorage`-Einträge werden dabei **nicht** gelöscht (Sicherheitsnetz), können aber nach einer Kontrolle des migrierten Bestands gefahrlos ignoriert werden.

## Backup-Strategie

⚠️ **Die Daten liegen ausschließlich lokal in der IndexedDB dieses einen Browsers auf diesem einen Gerät.** Es gibt keine Cloud-Synchronisation. Löscht der Browser seine Website-Daten (manuell, durch „Speicherplatz freigeben“ des iPhones oder eine Neuinstallation), sind Produkte, Verkäufe und Bewegungen unwiderruflich weg.

Empfehlung: Regelmäßig (z. B. nach jedem Verkaufstag) unter **Einstellungen → Daten exportieren (JSON)** ein Backup erstellen und außerhalb des Geräts sichern (Mail an sich selbst, Cloud-Speicher o. Ä.). Über **Daten importieren (JSON)** lässt sich ein Export jederzeit wiederherstellen.

## Lokal ausprobieren

Da die App `crypto.subtle` (PIN-Hashing) und ES-Module nutzt, muss sie über `http://localhost` oder `https://` aufgerufen werden (nicht per `file://`). Am einfachsten mit einem kleinen lokalen Server:

```bash
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

## Einrichtung von GitHub Pages

1. Im Repository zu **Settings → Pages** gehen.
2. Unter **Build and deployment → Source** die Option **„GitHub Actions“** auswählen.
3. Unter **Settings → Environments → github-pages → Deployment branches and tags** sicherstellen, dass der Branch `main` deployen darf (z. B. „No restriction“ oder `main` explizit erlauben).
4. Nach dem nächsten Push auf den Branch `main` deployt der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) die App automatisch über `actions/deploy-pages@v4`.

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

Der Workflow läuft dann unter dem Reiter **Actions** im Repository – nach ein bis zwei Minuten ist die aktualisierte Version live. Bei App-Updates wird die Service-Worker-Cache-Version hochgezählt (`service-worker.js` → `CACHE_VERSION`), damit alte, zwischengespeicherte Dateien zuverlässig ersetzt werden.

## Als App auf dem iPhone installieren

1. Die Live-URL in **Safari** öffnen.
2. Auf das **Teilen-Symbol** tippen.
3. **„Zum Home-Bildschirm“** auswählen.
4. Die App startet danach im Vollbild-Modus (ohne Browser-Leiste) und funktioniert auch offline.

## Dateistruktur

```
/index.html                  Grundgerüst & Navigation (6 Tabs + Subviews)
/style.css                   Mobile-First Styling, Dark Mode, CSS-Diagramme
/manifest.json                PWA-Manifest
/service-worker.js            Offline-Caching (Cache-Version pro Release hochzählen)
/icon-192.png, icon-512.png   App-Icons
/.github/workflows/deploy.yml GitHub Actions Deployment nach GitHub Pages
/js/
  app.js                       Bootstrap, Routing-Verdrahtung, Service-Worker-Registrierung
  db.js                        IndexedDB-Wrapper (Object Stores: products, sales, movements, settings, meta)
  migration.js                 Einmalige Migration von localStorage → IndexedDB
  state.js                     Globaler State, Events, Mutationen (Verkauf, Lagerbuchungen, Export/Import)
  router.js                    Tab- & Subview-Navigation
  utils.js                     Formatierung, PIN-Hashing, Toast/Confirm-Helpers
  stats.js                     Alle Statistik-Berechnungen
  barcode.js                   Scanner-Logik (BarcodeDetector API + CDN-Fallback)
  demo-data.js                 Beispielprodukte (Getränkeverkauf / Vereinsfest)
  ui/
    pin.js                     PIN-Screen, Onboarding, Sperr-Timer
    kasse.js                   Kassenansicht + Bezahlvorgang
    produkte.js                Produktverwaltung (CRUD)
    lager.js                   Lager-Übersicht, Filter, Suche
    stock-form.js               Gemeinsame Logik für Wareneingang/-ausgang
    wareneingang.js / warenausgang.js
    inventur.js                 Inventur mit Soll/Ist-Abgleich
    bewegungen.js                Bewegungsverlauf
    produkt-detail.js            Produkt-Detail mit Verkaufsstatistik
    bestellliste.js               Bestellliste für kritische Bestände
    historie.js                  Verkaufshistorie
    statistik.js                 Statistik-Tab mit CSS-Diagrammen
    einstellungen.js             Einstellungen, Export/Import, Datenlöschung
```

## Daten & Datenschutz

Alle Daten (Produkte, Verkäufe, Lagerbewegungen, Einstellungen, PIN-Hash) werden ausschließlich lokal in der `IndexedDB` des Browsers gespeichert. Es gibt keinen Server und keine Übertragung an Dritte. Über **Einstellungen → Daten exportieren** lässt sich jederzeit ein vollständiges JSON-Backup erstellen, über **Daten importieren** wieder einspielen (überschreibt den aktuellen Datenbestand nach Bestätigung).
