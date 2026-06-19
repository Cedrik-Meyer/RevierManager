# CLAUDE.md – Projektkontext Jagdrevier-App

Diese Datei beschreibt das Projekt für den Coding-Agent. Bitte vor jeder Aufgabe
beachten und bei grundlegenden Entscheidungen konsistent zu diesem Dokument bleiben.
Wenn etwas hier im Widerspruch zu einer Anfrage steht, weise darauf hin, statt es
stillschweigend zu überschreiben.

---

## 1. Projektüberblick

Eine private Anwendung zur Verwaltung eines Jagdreviers in Niedersachsen (Deutschland).
Kern ist eine Karte, die die Reviergrenzen darstellt und auf der Reviereinrichtungen
(Hochsitze, Futterstellen, Wildkameras usw.) verortet und verwaltet werden.

**Nutzung:** Zunächst Einzelnutzer (der Eigentümer des Projekts). Mehrnutzer-Betrieb
für Mitjäger ist für später geplant, aber **nicht** Teil der ersten Version. Keine
Kommerzialisierung, keine Nutzung über das eigene Revier hinaus.

**Wichtig:** Der Eigentümer ist kein erfahrener Entwickler bei Projekten dieser Größe.
Daher gilt:
- Code an wichtigen Stellen verständlich erklären, nicht nur liefern.
- Einfache, gängige Lösungen bevorzugen. Keine unnötigen Abstraktionen oder
  Bibliotheken einführen. Im Zweifel die simplere Variante und kurz begründen.
- In kleinen, testbaren Schritten arbeiten (siehe Abschnitt 7).

---

## 2. Tech-Stack

- **Sprache:** TypeScript (durchgängig, kein reines JavaScript).
- **Frontend-Framework:** React.
- **Build-Tool:** Vite.
- **Karte:** Leaflet (über `react-leaflet`).
- **Lokale Speicherung (Phase 1):** IndexedDB, gekapselt über Dexie.
- **Backend/Datenbank (Phase 2, noch NICHT bauen):** Supabase
  (PostgreSQL + PostGIS + Auth).
- **Bereitstellung:** Progressive Web App (PWA), installierbar auf dem Handy,
  offline-fähig. Keine native App, kein App-Store.

Keine zusätzlichen Frameworks/Bibliotheken ohne Rückfrage einführen.

---

## 3. Architektur & Phasenplan

Die App muss im Feld **ohne Internet** funktionieren. Das prägt die gesamte Architektur.

- **Phase 1 (aktuell):** Rein lokal. Alle Daten in IndexedDB auf dem Gerät.
  Kein Backend, kein Login, keine Cloud. Ziel: schnell etwas Nutzbares.
- **Phase 2 (später):** Supabase ergänzen für Login und Synchronisation, damit
  Mitjäger mitnutzen können. Erst beginnen, wenn Phase 1 stabil läuft.

Das Datenmodell (Abschnitt 4) ist bereits jetzt so ausgelegt, dass Phase 2 ohne
grundlegenden Umbau möglich ist. Diese Vorausplanung nicht entfernen, auch wenn sie
in Phase 1 noch nicht „gebraucht" wird (UUIDs, Zeitstempel).

---

## 4. Datenmodell

Alle Geodaten werden als **GeoJSON** gespeichert (Leaflet und PostGIS verstehen es nativ).

### Geteilte Felder
Jeder Datensatz hat:
- `id`: UUID (per `crypto.randomUUID()`). **Keine** fortlaufenden Zahlen — sonst
  Kollisionen, wenn später mehrere Personen offline gleichzeitig anlegen.
- `erstelltAm`: ISO-8601-Zeitstempel (String).
- `geaendertAm`: ISO-8601-Zeitstempel (String). Wird für die spätere Synchronisation
  in Phase 2 gebraucht.

### Revier
```ts
interface Revier {
  id: string;            // UUID
  name: string;
  grenze: GeoJSON.MultiPolygon;  // MultiPolygon, falls Revier aus mehreren Flächen besteht
  erstelltAm: string;
  geaendertAm: string;
}
```

### Reviereinrichtung
```ts
type EinrichtungsTyp =
  | 'hochsitz'
  | 'kanzel'
  | 'ansitzleiter'
  | 'bodensitz'
  | 'futterstelle'
  | 'kirrung'
  | 'salzlecke'
  | 'suhle'
  | 'wildkamera'
  | 'sonstiges';

type Zustand = 'ok' | 'reparaturbeduerftig' | 'gesperrt';

interface Reviereinrichtung {
  id: string;                    // UUID
  typ: EinrichtungsTyp;
  name?: string;                 // optional, z. B. "Kanzel am Buchenweg"
  geometrie: GeoJSON.Point;
  notiz?: string;                // optional
  zustand: Zustand;              // Default 'ok', sicherheitsrelevant
  erstelltAm: string;
  geaendertAm: string;
}
```

**Hinweis für später:** Manche Objekte (z. B. Wildwiese/Äsungsfläche) sind eigentlich
Flächen, keine Punkte. In Phase 1 wird alles als Punkt behandelt. Flächen werden erst
bei Bedarf ergänzt.

---

## 5. MVP-Umfang (Phase 1)

**Enthalten:**
- Karte mit eigenem Standort und Hintergrundkarte.
- Reviergrenze als Polygon anzeigen.
- Reviereinrichtungen als Punkte anzeigen, je Typ eigenes Symbol/eigene Farbe.
- Einrichtung anlegen (auf Karte tippen → Typ wählen → Name/Notiz), bearbeiten, löschen.
- Lokale Speicherung, offline nutzbar.

**Bewusst NICHT enthalten** (nicht ohne Rückfrage bauen):
Login/Mehrnutzer, Cloud-Sync, Fotos, Streckenbuch, Wetter/Wind, Wildkamera-Bilder.

---

## 6. Bekannte Fallstricke

- **Koordinaten-Reihenfolge:** GeoJSON nutzt `[Längengrad, Breitengrad]` (lng, lat).
  Leaflet erwartet in seiner eigenen API dagegen `[Breitengrad, Längengrad]` (lat, lng).
  Das ist die häufigste Fehlerquelle. Intern immer GeoJSON-Konvention speichern und nur
  an der Leaflet-Schnittstelle umdrehen. Bei jedem Umgang mit Koordinaten kurz prüfen.
- **GeoJSON als einziges Geodaten-Format** verwenden, nirgends eigene Koordinaten-Formate
  erfinden.
- **Standort/Geolocation** braucht HTTPS (oder localhost) und die Erlaubnis des Nutzers.
  Fehlerfall (abgelehnt / kein Signal) sauber abfangen.
- **Offline:** Kartenkacheln und App-Shell müssen für die Offline-Nutzung zwischen-
  gespeichert werden. Das beim PWA-/Service-Worker-Schritt mitdenken.

---

## 7. Arbeitsweise mit dem Agent

- **Kleine Schritte:** Immer eine abgegrenzte, testbare Aufgabe umsetzen, nicht mehrere
  Funktionen auf einmal.
- **Vor großen Änderungen fragen:** Strukturelle Eingriffe, neue Bibliotheken oder
  Umbauten am Datenmodell vorher ansprechen und begründen.
- **Erklären statt Blackbox:** An wichtigen Stellen kurz erläutern, was der Code tut
  und warum.
- **Einfachheit:** Wenn eine Lösung kompliziert wird, auf einfachere Alternativen
  hinweisen.

---

## 8. Konventionen

- **Sprache im Code:** Bezeichner (Variablen, Typen, Felder) auf Deutsch, passend zum
  Datenmodell oben (z. B. `reviereinrichtung`, `geaendertAm`). Konsistenz geht vor
  Sprachmischung.
- **Kommentare und Erklärungen:** Deutsch.
- **Formatierung:** Prettier (Standardeinstellungen).
- **Ordnerstruktur:** Pragmatisch und flach halten, solange das Projekt klein ist.
  Nicht vorab überstrukturieren.