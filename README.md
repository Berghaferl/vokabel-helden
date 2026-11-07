# Vokabel-Helden

Vokabeltrainer für das Englischbuch „English G Headlight 1“ (Cornelsen). Läuft im Browser, keine Installation, kein Server nötig.
Vorinstalliert ist Seite 190 („Nice to meet you!“, 39 Einträge).

## Dateien

| Datei | Wofür |
|---|---|
| `index.html` | die ganze App |
| `manifest.webmanifest`, `sw.js`, `*.png` | Symbol auf dem Home-Bildschirm und Offline-Betrieb |
| `seite-190.txt` | Beispiel für das Import-Format |

## Veröffentlichen – Variante A: GitHub Pages (am einfachsten)

1. Auf github.com ein neues Repository anlegen, z. B. `vokabel-helden` (muss für das kostenlose GitHub Pages **öffentlich** sein; es stehen nur Vokabeln darin, der Lernstand bleibt auf dem Gerät).
2. „Add file → Upload files“ und **alle** Dateien aus diesem Ordner hochladen (entpackt, nicht als ZIP).
3. Settings → Pages → Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)`. Nach ein bis zwei Minuten steht die Adresse da: `https://<dein-name>.github.io/vokabel-helden/`
4. Adresse auf dem iPad in **Safari** öffnen.

## Variante B: Synology

1. Web Station installieren, einen statischen Webserver anlegen, Ordner z. B. `web/vokabel`, und alle Dateien dort hineinkopieren.
2. **Wichtig:** Das Mikrofon (Einsprechen) funktioniert nur über **HTTPS**. Also Reverse Proxy + Zertifikat (z. B. Let's Encrypt über deine Synology-Adresse) einrichten. Ohne HTTPS gehen Vorlesen, Schreiben und Aufdecken, aber nicht das Einsprechen.

## Auf dem iPad / iPhone

- Einsprechen: In den iOS-Einstellungen muss die **Diktierfunktion** an sein (Einstellungen → Allgemein → Tastatur → Diktierfunktion). Beim ersten Mal das Mikrofon erlauben. Die Erkennung läuft über Apple-Server, also mit Internet.
- „Zum Home-Bildschirm“ (Teilen-Symbol in Safari) legt ein App-Symbol an. **Bitte ausprobieren, ob das Einsprechen auch darüber geht.** Wenn nicht, die Seite im Safari öffnen (Lesezeichen) und Schreiben/Aufdecken nutzen, wenn kein Mikro.
- Der Lernstand liegt im Browser des Geräts. Jedes Gerät (iPad, PC, Handy) hat seine eigenen Daten, auch Safari und das Home-Bildschirm-Symbol sind getrennt. Unter „Vokabeln → Sicherung“ kann alles als Datei gesichert und auf einem anderen Gerät wieder geladen werden – ab und zu machen. Auf Wunsch kommt der API-Schlüssel mit in die Sicherung (Datei dann nicht weitergeben).

## Üben

- **Quiz im Querformat:** Frage links, Lösung rechts, die Töpfe stehen groß fest unten. Die Vokabel fliegt von der Karte in den Topf, in dem sie lag, und von dort in den neuen Topf.
- **Belohnung:** Konfetti, Feuerwerk, Emoji-Regen oder Ballons plus wechselnde Sprüche (Einstellungen → Belohnung, auch abschaltbar).
- **Korrigieren mitten in der Aufgabe:** Der kleine ✏️-Knopf oben rechts in der Karte (und „Vokabel korrigieren“ nach dem Prüfen) öffnet direkt das Bearbeiten-Fenster.
- **Suche / Wörterbuch:** Vokabeln → Suchfeld. Durchsucht alle Seiten (Englisch und Deutsch), mit 🔊 zum Anhören und ✏️ zum Korrigieren.
- **Mehrzahl und Klammern:** „fish, pl fish“ wird als Wort „fish“ gefragt und gesprochen (Mehrzahl nur als Hinweis). Bei „listen (to)“ gelten „listen“ und „listen to“ als richtig. Hinweise wie „(= I am)“ oder „(wörtlich: …)“ müssen nicht gesagt werden.
- **Startseite:** Seiten mit gleicher Überschrift (oder gleicher „Gruppe“, einstellbar unter Vokabeln → Seite → ✏️) sind zuklappbar zusammengefasst. Pro Seite steht, wie viele Vokabeln neu, am Üben oder fertig sind.
- **Gezielt aus einem Topf üben:** Meine Töpfe → Topf antippen → 10, 20 oder alle üben.

## Neue Seiten hinzufügen (Tochter/Frau können das selbst)

### Mit Foto-Scan (empfohlen)

Einmalig, durch ein Elternteil: Unter **Einstellungen → Foto-Scan** einen Claude-API-Schlüssel eintragen (Anleitung steht dort in der App). Der Schlüssel liegt nur auf diesem Gerät, nicht im Backup und nicht auf GitHub. Beim Scannen wird das Foto zur Erkennung an Anthropic gesendet; eine Seite kostet in der Regel nur wenige Cent.

Danach: **Vokabeln → Neue Seite hinzufügen → 📷 Foto aufnehmen** (oder „Aus Fotos wählen“, auch mehrere Fotos auf einmal). Nach etwa 10–20 Sekunden erscheint eine Vorschau mit dem Foto zum Vergleichen. Stimmt etwas nicht, im Textfeld korrigieren und „Prüfen“ tippen, sonst „Speichern“.
Tipp für gute Ergebnisse: nur die Vokabelspalten, gerade von oben, gut beleuchtet.

### Ohne Foto-Scan (von Hand)

1. In der App: **Vokabeln → Neue Seite hinzufügen**.
2. Foto der Buchseite machen und in Claude (oder ChatGPT/Gemini) hochladen. Dazu den Auftrag schicken, den die App mit einem Tipp auf „Auftrag kopieren“ bereitstellt.
3. Die Antwort in der App einfügen, „Prüfen“ tippen, Vorschau kontrollieren, „Speichern“.

Format pro Zeile: `englisch [Lautschrift] | deutsch`. Mehrere deutsche Bedeutungen mit `;` oder `,` trennen – jede gilt als richtige Antwort.
Eine Zeile `# Seite 191 | Überschrift` am Anfang legt Seitenzahl und Titel fest; so lassen sich auch mehrere Seiten auf einmal einfügen.
Einzelne Vokabeln lassen sich unter „Vokabeln → Seite antippen → ✏️“ korrigieren.
