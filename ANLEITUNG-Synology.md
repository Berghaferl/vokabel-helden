# Sync auf der Synology einrichten

Ziel: Vokabeln und Lernstand liegen zusätzlich auf deiner Synology. Alle Geräte (iPad, PC, später Handy) gleichen sich damit ab. Die App funktioniert weiter ohne Netz und gleicht später ab.

**Wie es zusammenspielt**

- Die App bleibt auf GitHub Pages (`https://berghaferl.github.io/vokabel-helden/`).
- Auf der Synology läuft ein kleiner Dienst (`server/server.js`) im Docker-Container. Er speichert eine Datei und prüft ein Passwort.
- Die App spricht den Dienst über eine **HTTPS-Adresse mit gültigem Zertifikat** an, z. B. `https://vokabel.deinedomain.de`. Diese Adresse zeigt auf die interne IP der Synology. Sie ist von außen nicht erreichbar, das iPad muss dafür zu Hause im WLAN sein.
- Warum HTTPS: GitHub Pages läuft über HTTPS, und Safari blockiert Aufrufe an normale `http://`-Adressen.

> Hinweis: Den Dienst und die App habe ich mit einem lokalen Testserver ausprobiert, nicht auf einer echten Synology. Die Schritte unten sind der übliche Weg bei Container Manager (DSM 7.2+). Bitte melde dich, wenn irgendwo etwas anders aussieht.

---

## 1. Dienst starten (Container Manager)

1. In **File Station** einen Ordner anlegen, z. B. `docker/vokabel-sync`, darin einen Unterordner `data`.
2. Aus dem Projekt die Dateien `server/server.js` und `server/docker-compose.yml` in `docker/vokabel-sync` kopieren.
3. `docker-compose.yml` öffnen und bei `TOKEN` ein **langes, zufälliges Passwort** eintragen (das tippst du später in der App ein).
4. **Container Manager → Projekt → Erstellen**: Name `vokabel-sync`, Pfad `docker/vokabel-sync`, vorhandene `docker-compose.yml` verwenden → Fertig. Der Container lädt das Image `node:22-alpine` und startet.
5. Test im Browser im Heimnetz: `http://<IP-der-Synology>:8787/api/health` → es muss `{"ok":true,"rev":0}` erscheinen.

Falls die DSM-Firewall aktiv ist: Port 8787 (oder später 443) für das lokale Netz erlauben.

## 2. Adresse (Subdomain) anlegen

1. Bei deinem Domain-Anbieter einen **A-Eintrag** anlegen: `vokabel.deinedomain.de` → **interne IP** der Synology (z. B. `192.168.178.20`). Eine private IP in einem öffentlichen DNS-Eintrag ist erlaubt und von außen wertlos.
2. **Fritz!Box:** Sie blockiert solche Einträge oft („DNS-Rebind-Schutz“). Dann unter *Heimnetz → Netzwerk → Netzwerkeinstellungen → Weitere Einstellungen → DNS-Rebind-Schutz* die Domain `deinedomain.de` als Ausnahme eintragen.
3. Dem Synology feste IP im Router geben (DHCP-Reservierung), damit der Eintrag stimmt.

## 2b. Domain bei Hosteurope: DNS zu Cloudflare umziehen (einmalig)

Hosteurope bietet keine offizielle DNS-Schnittstelle an, über die ein Zertifikat automatisch bestätigt werden könnte. Wenn die Domain sonst nicht genutzt wird (keine Webseite, keine E-Mail), ist der einfachste Weg, **nur die Namensverwaltung** zu Cloudflare (kostenlos) zu verlegen. Die Domain bleibt bei Hosteurope registriert und wird dort weiter bezahlt.

1. Konto bei Cloudflare anlegen → **Domain hinzufügen** → Tarif **Free**. Cloudflare zeigt zwei Nameserver an (z. B. `xxx.ns.cloudflare.com`). Vorhandene Einträge prüfen und übernehmen, falls doch etwas daran hängt (E-Mail, Webseite).
2. Bei Hosteurope im KIS die Nameserver ändern: *Produktverwaltung → Domainservices → Administration → Nameserver / DNS-Einträge bearbeiten*, dort die Domain-Aktualisierung mit eigenen Nameservern wählen und die zwei Cloudflare-Nameserver eintragen. Danach kommt eine Bestätigungs-E-Mail von Hosteurope, deren Link du anklicken musst. Das gilt dort als Experteneinstellung. Die Bildschirme können bei dir etwas anders aussehen, im Zweifel hilft der Hosteurope-Support.
3. Warten (meist Stunden, bis zu 48 Stunden), bis Cloudflare die Domain als **„Aktiv“** anzeigt.
4. In Cloudflare unter **DNS → Einträge** den A-Eintrag anlegen: Name `vokabel`, IPv4 = interne IP der Synology (z. B. `192.168.178.20`), **Proxy-Status auf „Nur DNS“ (graue Wolke)**.
5. **API-Token** erzeugen: *Mein Profil → API-Tokens → Token erstellen → Vorlage „Zone-DNS bearbeiten“*, auf deine Domain beschränken. Das Token (lange Zeichenfolge) brauchst du im nächsten Schritt und niemandem sonst zeigen.

Statt des Umzugs geht auch ein Weg ohne Nameserver-Wechsel (CNAME auf einen „acme-dns“-Dienst, den Hosteurope unterstützt). Er ist aber technischer und ich würde ihn nur nehmen, wenn die Domain doch anderweitig genutzt wird.

## 3. HTTPS-Zertifikat (Let's Encrypt per DNS-Bestätigung)

Weil die Synology nicht aus dem Internet erreichbar sein soll, bestätigt Let's Encrypt die Domain über einen DNS-Eintrag. Dafür brauchst du einen DNS-Anbieter, der eine API bietet (z. B. Cloudflare, Hetzner, IONOS, Strato eingeschränkt, ...). Sag mir, wo deine Domain liegt, dann schreibe ich dir die passenden Zeilen.

**Weg A: Nginx Proxy Manager (grafisch, empfohlen)**

1. Als zweites Projekt im Container Manager `jc21/nginx-proxy-manager` starten. DSM belegt die Ports 80/443 selbst, deshalb den Container z. B. auf **8080 (HTTP), 8443 (HTTPS), 8181 (Verwaltung)** legen.
2. In der Verwaltung (`http://<IP>:8181`) unter **SSL Certificates → Add → Let's Encrypt** die Domain `vokabel.deinedomain.de` eintragen, **DNS Challenge** wählen, Anbieter und API-Schlüssel eintragen.
3. Unter **Proxy Hosts → Add**: Domain `vokabel.deinedomain.de`, Ziel `http://<IP-der-Synology>:8787`, Reiter SSL → das Zertifikat wählen, „Force SSL“ an.
4. Die Adresse in der App lautet dann `https://vokabel.deinedomain.de:8443`.

**Weg B: DSM-eigener Reverse Proxy (Adresse ohne Port)**

1. Zertifikat per `acme.sh` (z. B. im Container `neilpang/acme.sh`) mit DNS-API ausstellen lassen und in DSM unter **Systemsteuerung → Sicherheit → Zertifikat → Hinzufügen → Zertifikat importieren** laden.
2. **Systemsteuerung → Anmeldeportal → Erweitert → Reverse Proxy → Erstellen**: Quelle `HTTPS`, `vokabel.deinedomain.de`, Port 443 → Ziel `HTTP`, `localhost`, Port 8787.
3. Unter **Zertifikat → Einstellungen** das Zertifikat dem neuen Eintrag zuweisen.
4. Die Adresse in der App lautet dann `https://vokabel.deinedomain.de`.

**Test:** `https://vokabel.deinedomain.de/api/health` (oder mit `:8443`) im Safari des iPads öffnen. Es muss `{"ok":true,...}` ohne Zertifikatswarnung erscheinen.

## 4. In der App verbinden

**Einstellungen → Synchronisieren** → Server-Adresse (mit `https://`), Passwort aus der `docker-compose.yml` und das Profil (z. B. `edda`) eintragen → **Verbinden**.

- **Vokabeln sind für alle Profile gemeinsam**, der **Lernstand pro Profil**. Edda und deine Frau können also dieselben Seiten nutzen, jede mit eigenem Stand.
- Auf jedem weiteren Gerät genauso verbinden (gleiches Profil = gleicher Lernstand).
- Der erste Abgleich führt vorhandene Daten zusammen, nichts geht verloren.
- Abgeglichen wird beim Öffnen der App, nach jeder Übungsrunde und kurz nach Änderungen. Oben auf der Startseite zeigt ein ☁️-Symbol den Stand.
- Während einer Übungsrunde wird nicht abgeglichen.

## 5. Betrieb

- **Daten:** `docker/vokabel-sync/data/data.json`. Die letzten 30 Tagesstände liegen in `data/backup/`. Den Ordner `data` in **Hyper Backup** aufnehmen.
- **Passwort ändern:** in der `docker-compose.yml` ändern, Projekt neu starten, in der App „Trennen“ und neu verbinden.
- **Dienst aktualisieren:** neue `server.js` über die alte kopieren, Projekt neu starten.
- **Sicherung per Datei** (Vokabeln → Sicherung speichern) bleibt als zusätzliches Netz sinnvoll.
- Die Uhrzeiten der Geräte sollten stimmen (Automatisch einstellen). Bei Änderungen am selben Wort gewinnt die jüngere.
- Eine Sicherung **laden** bei aktivem Sync führt die Daten mit dem Serverstand zusammen und ersetzt ihn nicht.

## Wenn es nicht klappt

| Meldung / Problem | Meist die Ursache |
|---|---|
| „Server nicht erreichbar“ | Nicht im Heimnetz; Zertifikat ungültig (Test mit `/api/health` im Safari); DNS-Eintrag falsch oder Fritz!Box-Rebind-Schutz; Firewall |
| „Passwort stimmt nicht“ | `TOKEN` in `docker-compose.yml` passt nicht (Projekt nach Änderung neu starten) |
| „Das ist nicht der Sync-Dienst“ | Adresse zeigt auf etwas anderes (Port prüfen) |
| Test im Browser ok, App sagt „nicht erreichbar“ | `ALLOW_ORIGIN` in `docker-compose.yml` muss `https://berghaferl.github.io` sein (genau so, ohne Pfad) |
| „Zu viele Fehlversuche“ | Nach 10 falschen Passwörtern 10 Minuten Pause |
