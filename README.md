# IT-Ticketing Kanban App

Kleine Organisations-App, mit der du IT-Probleme als Tickets erfassen und über ein Kanban-Board verwalten kannst.

## Funktionen

- Vollflächiges Kanban-Board über die gesamte Seite
- Neues Ticket über **+ Buttons in den Spalten-Kopfzeilen** (Ticket wird direkt in dieser Spalte angelegt)
- Ticket-Erfassung (Titel, Beschreibung, Priorität)
- Vier Kanban-Spalten: **Backlog**, **In Arbeit**, **Warten**, **Erledigt**
- Drag & Drop zwischen den Spalten und Neuordnung innerhalb jeder Spalte
- Suche über Titel und Beschreibung
- Tickets per Klick im Dialog bearbeiten: inkl. Spaltenwechsel, Kommentare und Löschen
- Kommentare werden auf Karten als Anzahl angezeigt; Detailansicht als Nachrichten im geöffneten Dialog mit einzeiligem Eingabefeld + Senden-Button
- Automatisches Speichern beim Verlassen des Bearbeiten-Dialogs (Esc/außerhalb klicken)
- Speicherung im Browser per `localStorage`

## Start

Öffne einfach `index.html` im Browser.

Alternativ mit lokalem Server:

```bash
python3 -m http.server 4173
```

Dann aufrufen: <http://localhost:4173>
