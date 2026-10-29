# Änderungen

## 0.2.1 – 29.10.2026

- Union-Fonds laden zusätzlich die veröffentlichten Länder, Branchen und größten Einzelpositionen aus der offiziellen Fondsansicht.
- UniImmo: Regionen und Nutzungsarten des Immobilienportfolios separat als Balkenanzeigen; keine falsche Übernahme als Gewichte des gesamten Fondsvermögens.
- Unterschiedliche Prozenteinheiten werden geprüft; Datenstand, Quellenlink und nicht aufgeschlüsselte Restanteile bleiben sichtbar.
- Vorhandene Daten bleiben bei einem Abruffehler erhalten; Rohstoff-Engagements werden nicht mit Sicherheitenbeständen verwechselt.
- Geprüft mit UniEM Global A, UniGlobal und UniFonds sowie automatisierten Regressionstests. Die Anbieteransicht liefert keine vollständige Bestandsliste.

## 0.2.0 – 29.10.2026

- Allgemeine Union-Investment-Suche über offizielles Produktverzeichnis und bestätigte Produktprofile.
- Zusätzliche ISIN-genaue Onvista-Suche für weitere Fonds, ETFs, Aktien und andere Wertpapiere.
- Direkter Import selbst gefundener Produktlinks für unterstützte Seiten; manuelle Erfassung mit Quellenlink, falls der Import nicht gelingt.
- Länder-Kürzel vereinheitlicht; gleichnamige Bestände ohne ISIN werden nicht mehr produktübergreifend automatisch zusammengefasst.
- Gesamtübersicht erklärt ausgeschlossene Produkte ohne Bestand, EUR-Bewertung und unbekannte Restanteile.
- Regressionstests für Summen, Verknüpfungen, Linkimport, Identitätsprüfung und ausgefallene Quellen.

Gespeicherte Bestände und eigene Angaben bleiben erhalten. Fehlende Fondsbestände werden weiterhin nicht als vollständige Analyse dargestellt. Keine automatische Neubewertung oder Fremdwährungsumrechnung.
