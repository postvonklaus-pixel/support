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
- 💱 **Mehrwährungsfähig**: Euro (EUR), Indonesische Rupiah (IDR) und US-Dollar (USD), inkl. einmaliger Preis-Umrechnung EUR → IDR
- 📷 **Barcode-Scanner** auch in Wareneingang, Warenausgang und Inventur (Dauer-Modus: mehrere Artikel am Stück scannen, mit Ton/Vibration/Blitz-Feedback)
- ⚙️ Einstellungen: Geschäftsname, Währung, Lagerverwaltung an/aus, Scanner-Optionen, PIN ändern, Bestände neu berechnen, Export/Import (JSON), alle Daten löschen
- 📴 Offline-fähig durch Service Worker

Der **Standard-PIN** beim ersten Start ist **1234** und kann jederzeit in den Einstellungen geändert werden.

## Datenmigration von der Vorversion

Diese Version ersetzt `localStorage` durch `IndexedDB`, da Produktfotos, Verkaufshistorie und Lagerbewegungen zusammen das 5-MB-Limit von `localStorage` in Safari sprengen können. Beim ersten Start nach dem Update werden vorhandene `localStorage`-Daten (Produkte, Verkäufe, Einstellungen, PIN) automatisch nach IndexedDB übernommen – ein Hinweis erscheint direkt nach dem Start. Die alten `localStorage`-Einträge werden dabei **nicht** gelöscht (Sicherheitsnetz), können aber nach einer Kontrolle des migrierten Bestands gefahrlos ignoriert werden.

## Backup-Strategie

⚠️ **Die Daten liegen ausschließlich lokal in der IndexedDB dieses einen Browsers auf diesem einen Gerät.** Es gibt keine Cloud-Synchronisation. Löscht der Browser seine Website-Daten (manuell, durch „Speicherplatz freigeben“ des iPhones oder eine Neuinstallation), sind Produkte, Verkäufe und Bewegungen unwiderruflich weg.

Empfehlung: Regelmäßig (z. B. nach jedem Verkaufstag) unter **Einstellungen → Daten exportieren (JSON)** ein Backup erstellen und außerhalb des Geräts sichern (Mail an sich selbst, Cloud-Speicher o. Ä.). Über **Daten importieren (JSON)** lässt sich ein Export jederzeit wiederherstellen.

## Währung umstellen (EUR ↔ IDR)

Unter **Einstellungen → Währung** lässt sich jederzeit zwischen **Euro (EUR)**, **Indonesische Rupiah (IDR)** und **US-Dollar (USD)** wechseln. Der Wechsel ändert nur die **Anzeige/Formatierung** (Symbol, Dezimalstellen, Tausendertrennzeichen) – bestehende Preise werden dabei **nicht** umgerechnet. Ein Bestätigungsdialog weist vor jedem Wechsel darauf hin.

Beim ersten Start stehen sowohl deutsche (EUR) als auch indonesische (IDR) Beispiel-Sortimente zur Auswahl; „Getränkeverkauf (Indonesien, IDR)" ist voreingestellt empfohlen.

⚠️ **Wichtig:** Beim Währungswechsel werden **historische Verkäufe nicht umgerechnet** – ihr ursprünglicher Betrag bleibt unverändert gespeichert, wird aber ab dem Wechsel im neuen Währungsformat angezeigt (z. B. ein alter 1,50-€-Verkauf erscheint danach als „Rp 2"). Das ist beabsichtigt (die Buchhaltung bleibt korrekt, nur die Anzeige folgt der aktuell eingestellten Währung) – vor einem Wechsel empfiehlt sich trotzdem ein Blick in die Historie bzw. ein JSON-Export als Referenz.

## Preise einmalig umrechnen

Wurden Produkte in EUR angelegt und soll künftig in IDR verkauft werden, rechnet **Einstellungen → „Alle Preise EUR → IDR umrechnen"** alle Produktpreise in einem Rutsch um:

1. Umrechnungsfaktor eingeben (Standard: 16.000)
2. Rundung wählen (auf 500 / 1.000 / 5.000 oder keine Rundung)
3. Vorschau der Umrechnung prüfen
4. Bestätigen → ein JSON-Backup wird automatisch heruntergeladen, danach werden alle Produktpreise umgerechnet und die Währung auf IDR umgestellt

**Wichtig:**
- Die Aktion kann **nicht rückgängig gemacht** werden (daher der automatische Backup-Download vorher) – bei Bedarf über **Daten importieren** wiederherstellen.
- **Die Verkaufshistorie bleibt unverändert in EUR** – nur `Product.price` wird umgerechnet, niemals `Sale.items[].price` oder `Sale.total` vergangener Verkäufe.
- Die Umrechnung lässt sich pro Installation nur **einmal** ausführen (Button wird danach ausgegraut); ebenso ist sie gesperrt, sobald die Währung bereits auf IDR steht.

## Barcode im Wareneingang / Warenausgang / Inventur

Der Barcode-Scanner (siehe Produktverwaltung) steht zusätzlich in **Lager → Wareneingang**, **Warenausgang** und **Inventur** zur Verfügung (Button „📷 Scannen" oben rechts):

- **Wareneingang/Warenausgang:** Jeder erkannte Barcode fügt automatisch eine Position hinzu bzw. erhöht die Menge einer bereits gescannten Position. Unbekannte Barcodes zeigen „Nicht gefunden" mit den Optionen „Neues Produkt anlegen" oder „Erneut scannen".
- **Inventur:** Der Scan springt zur passenden Zeile, hebt sie kurz farblich hervor und setzt den Fokus direkt ins Mengenfeld – so lässt sich das Lager im Rundgang scannen und zählen.
- Ist die Kamera nicht verfügbar oder der Barcode beschädigt, kann die Nummer jederzeit über „Barcode manuell eingeben" eingetippt werden.

## Scanner-Dauer-Modus

In den drei Lager-Screens läuft der Scanner immer im **Dauer-Modus**: Die Kamera bleibt nach einem Scan geöffnet, sodass mehrere Artikel direkt nacheinander gescannt werden können (Ton + Vibration + grüner/roter Kamera-Blitz als Feedback, Zähler „N Positionen gescannt" oben). „Fertig" schließt die Kamera; nach 5 Minuten Inaktivität schließt sie automatisch, nach 50 Scans am Stück fragt die App zur Sicherheit nach, ob weitergescannt werden soll.

In der Produktverwaltung (Produkt anlegen/bearbeiten) bleibt der Scanner im **Einzel-Modus** (ein Scan, Kamera schließt danach). Ton, Vibration und der Dauer-/Einzel-Modus für weitere Scan-Einstiege lassen sich unter **Einstellungen → Scanner** anpassen.

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
  migration.js                 Migration von localStorage → IndexedDB + Schema-Upgrades (dataVersion)
  state.js                     Globaler State, Events, Mutationen (Verkauf, Lagerbuchungen, Preis-Migration, Export/Import)
  router.js                    Tab- & Subview-Navigation
  utils.js                     Formatierung (Datum), PIN-Hashing, Toast/Confirm-Helpers
  currency.js                  Währungs-Konfiguration (EUR/IDR/USD), formatCurrency, Preis-Rundung
  stats.js                     Alle Statistik-Berechnungen
  barcode.js                   Scanner-Logik (BarcodeDetector API + CDN-Fallback), Einzel-/Dauer-Modus
  demo-data.js                 Beispielprodukte (Getränkeverkauf / Vereinsfest, je EUR & IDR)
  ui/
    pin.js                     PIN-Screen, Onboarding, Sperr-Timer
    kasse.js                   Kassenansicht + Bezahlvorgang
    produkte.js                Produktverwaltung (CRUD)
    lager.js                   Lager-Übersicht, Filter, Suche
    stock-form.js               Gemeinsame Logik für Wareneingang/-ausgang inkl. Scan-Integration
    wareneingang.js / warenausgang.js
    inventur.js                 Inventur mit Soll/Ist-Abgleich + Scan-Highlight
    bewegungen.js                Bewegungsverlauf
    produkt-detail.js            Produkt-Detail mit Verkaufsstatistik
    bestellliste.js               Bestellliste für kritische Bestände
    historie.js                  Verkaufshistorie
    statistik.js                 Statistik-Tab mit CSS-Diagrammen
    einstellungen.js             Einstellungen, Währung, Preis-Migration, Export/Import, Datenlöschung
```

## Daten & Datenschutz

Alle Daten (Produkte, Verkäufe, Lagerbewegungen, Einstellungen, PIN-Hash) werden ausschließlich lokal in der `IndexedDB` des Browsers gespeichert. Es gibt keinen Server und keine Übertragung an Dritte. Über **Einstellungen → Daten exportieren** lässt sich jederzeit ein vollständiges JSON-Backup erstellen, über **Daten importieren** wieder einspielen (überschreibt den aktuellen Datenbestand nach Bestätigung).
