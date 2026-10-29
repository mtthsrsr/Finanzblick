# Finanzblick

Deutschsprachige Desktop-App zur Analyse von Fonds, ETFs und Portfolios. Lokal gespeicherte Bestände, Produktsuche per ISIN, Quellenlinks und Aufschlüsselung nach Ländern und Einzelanlagen.

Finanzblick ergänzt ein Haushaltsbuch, manuelle Kontostände, Verbindlichkeiten, Sparszenarien und gespeicherte Vermögensstände.

## Herunterladen

Öffne **[Releases](https://github.com/mtthsrsr/Finanzblick/releases)** und wähle unter **Assets**:

| Gerät | Datei |
| --- | --- |
| Windows-PC mit Intel/AMD | `win-x64.exe` |
| Windows-PC mit ARM-Prozessor | `win-arm64.exe` |
| Mac mit Apple-Chip (M1/M2/M3/M4 usw.) | `mac-arm64.dmg` |
| Mac mit Intel-Prozessor | `mac-x64.dmg` |

Die Dateien beginnen zusätzlich mit dem App-Namen und der Versionsnummer. Die automatisch angebotenen „Source code“-Archive sind für Entwickler, keine Installer.

Windows: Installer starten. macOS: DMG öffnen und die App in Programme ziehen. Benötigt ein vom mitgelieferten Electron 43 unterstütztes 64-Bit-Betriebssystem. Windows 7/8 und alte macOS-Versionen werden nicht unterstützt.

**Erste öffentliche Vorabversion:** Die Pakete haben keine kommerzielle Windows-Signatur und keine Apple-Notarisierung. Betriebssysteme können deshalb beim ersten Öffnen warnen oder die Ausführung blockieren. Sicherheitsfunktionen nicht pauschal deaktivieren. Die Pakete werden automatisch gebaut; ein vollständiger manueller Test auf allen Zielgeräten steht noch aus. Fehler bitte über Issues melden.

## Funktionen und Grenzen

- Produktsuche und Anbieterinformationen mit überprüfbaren Quellenlinks.
- Gewichtung des Portfolios nach manuell gepflegten EUR-Marktwerten bzw. Stückzahl × EUR-Kurs.
- Unbekannte Anteile bleiben unbekannt; Top-10-Daten sind keine vollständige Bestandsliste.
- Zertifikate werden nicht fälschlich als direkte Fonds- oder Aktienbestände behandelt.
- Eigene Angaben sowie CSV-/Excel-Bestandslisten können ergänzt werden.
- Anbieter können Formate ändern oder Anfragen blockieren. Datenstände immer prüfen.
- Keine garantierten Echtzeitkurse, keine automatische Bankanbindung und keine Anlageberatung.

Persönliche Portfolios sind nicht enthalten. Die App speichert lokal im Benutzer-Appdatenverzeichnis unter `Finanzblick`. ISIN-Anfragen gehen an die jeweiligen Datenanbieter. JSON-Sicherungen können persönliche Finanzdaten enthalten: nicht in öffentliche Issues hochladen.

Beim ersten Start wird ein vorhandenes Fondsblick-Portfolio einmalig kopiert. Danach bleiben die Daten getrennt. Haushaltsbuchbuchungen ändern manuelle Kontostände nicht automatisch. Monatsregeln sind Planwerte. Vermögensstände sind kein Börsenkurs- oder Renditeverlauf.

## Selbst bauen

Node.js 22 und npm installieren, dann im Projektordner:

```sh
npm ci
npm run typecheck
npm test
npm start
```

Installer auf dem jeweiligen Betriebssystem bauen:

```sh
npm run dist
```

GitHub Actions baut die vier Zielplattformen bei Versions-Tags (`v…`). Erst wenn alle Builds erfolgreich waren, wird ein öffentliches Pre-Release mit Installern und SHA-256-Prüfsummen angelegt. Ein manueller Workflow-Lauf erzeugt lediglich Actions-Artefakte.

## Lizenz und Datenquellen

Eigener Anwendungscode: MIT, siehe LICENSE. Fremdbibliotheken behalten ihre jeweiligen Lizenzen. SheetJS 0.20.3 liegt als offizielles Paket in `vendor/`; seine Apache-2.0-Lizenz ist im Paket enthalten. Anbieter-Webseiten und komplette heruntergeladene Bestandslisten sind nicht Bestandteil der Testdaten. Tests verwenden synthetische Beispiele. Produktnamen und öffentlich bezogene Marktdaten bleiben ihren jeweiligen Rechteinhabern zugeordnet.

## Neu in 0.2.0: erweiterte Produktsuche und Seitenimport

- Union Investment: allgemeines öffentliches Produktverzeichnis statt eines einzelnen fest hinterlegten Fonds. Am 29.10.2026 enthielt das geprüfte Verzeichnis 258 Produktlinks. Die Liste wird zur Laufzeit geladen und höchstens sechs Stunden zwischengespeichert; sie ist keine Garantie für alle historischen, institutionellen oder nicht öffentlich gelisteten Anteilklassen.
- Deka: Fondsprofile, ETF-Verzeichnis und Zertifikatsprofile; zusätzlicher ISIN-genauer Onvista-Fallback, auch für andere Anbieter und Aktien. Ein Treffer bestätigt nicht die Handelbarkeit bei Trade Republic oder einem anderen Broker.
- Im Suchfeld kann eine selbst gefundene HTTPS-Produktseite eingefügt werden. Deka-, Union- und Onvista-Produktseiten werden direkt geprüft; justETF-Links mit ISIN werden ebenfalls unterstützt. Das funktioniert unabhängig davon, ob das Produktverzeichnis einen Treffer liefert. Links mit einer eindeutigen ISIN können auch die normale Suche auslösen.
- Andere Seiten werden nicht beliebig automatisch ausgelesen. Wenn kein bestätigter Treffer möglich ist: „Manuell anlegen“, ISIN und Namen eintragen und den ursprünglichen Link mit speichern. Der eigene Link bleibt bei Aktualisierungen erhalten und ist keine automatische Bestätigung der Identität.
- Identität und Bestandsdaten sind getrennt. Neue Union-/Onvista-Treffer können zunächst ohne Zusammensetzung erscheinen. Fehlende Bestände werden nicht erfunden. Der bekannte UniCommodities-Auszug bleibt ein ausdrücklich datierter historischer Stand.

### Gesamtportfolio nachvollziehbar berechnen

Jeder erfasste Depotbestand zählt mit seinem EUR-Marktwert (oder Stückzahl × EUR-Kurs) zum Gesamtwert, auch wenn die Aufteilung fehlt oder das Produkt manuell angelegt wurde. Gespeicherte Produkte ohne Bestand zählen nicht mit. Kurse werden nicht automatisch in EUR umgerechnet oder in den Bestand übernommen. Bestände und deren Bewertungsdatum müssen gepflegt werden.

Fondsanteile werden mit dem jeweiligen Depotwert gewichtet; unbekannte Restanteile bleiben Teil des Nenners. Direkt gehaltene Aktien und Fondspositionen mit derselben ISIN werden zusammengefasst. Gleichnamige Positionen ohne ISIN werden zwischen verschiedenen Produkten nicht mehr ungeprüft vereinigt. Länder-Kürzel wie US und ausgeschriebene Namen wie United States werden vereinheitlicht. Bereits vorhandene Toleranz für veröffentlichte Rundungssummen bis 100,5 %: diese werden auf 100 % begrenzt; höhere oder ungültige Summen werden nicht als Verteilung verwendet.

Eine verschachtelte Fondsauflösung verwendet die gespeicherte Produktbibliothek und zählt deren Bestandswert nicht erneut zum eingebetteten Anteil. Zyklen und Zertifikate werden nicht als unmittelbare Aktienpositionen ausgegeben. Daten unterschiedlicher Stichtage bleiben entsprechend gekennzeichnet; die Übersicht ist keine garantiert aktuelle vollständige Bestandsaufnahme aller Fonds.

Validierung: automatisierte Tests für unterschiedliche Marktwerte, fehlende Aufteilungen, manuelle Produkte, Stückzahlen, direkte Aktienüberschneidungen, Fondsverschachtelungen, Zyklen, Zertifikate und Erhaltung der Gesamtsumme. Direkter Seitenimport wird auch mit ausgefallener Verzeichnissuche getestet. Live-Abfragen sind Momentaufnahmen, keine dauerhafte Verfügbarkeitsgarantie.
