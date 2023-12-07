# NuxtSchulportal

get in some more nuuuuxt here

## Backend und API
- Root für die API ist <code>/api</code>
---
#### Anmeldung und Authentifizierung
- <code>POST</code> <code>/login</code> Anmeldung direkt beim SPH
- <code>GET</code> <code>/check</code> Überprüfung des Tokens
- <code>GET</code> <code>/decryption</code> Erstellung von AES-Key basierend auf Session
- <code>POST</code> <code>/resetpassword</code> 1. Schritt mit Geburtsdatum, Name und Schule
- <code>PUT</code> <code>/resetpassword</code> 2. Schritt mit Bestätigungscode
- <code>POST</code> <code>/autologin</code> Erneute Anmeldung mit Autologin-Token
---
#### SPH-Apps
Alle Apps benötigen das Token (sid) als <code>Authorization</code> header
- <code>GET</code> <code>/vertretungen</code> Individueller Vertretungsplan
- <code>GET</code> <code>/stundenplan</code> Persönlicher Stundenplan
- <code>GET</code> <code>/mylessons/courses</code> Kurse in **Mein Unterricht**
- <code>POST</code> <code>/mylessons/homework</code> Hausaufgaben als erledigt markieren
---
#### SchulMoodle
- Die Root der Moodle-API ist <code>/api/moodle</code>
- Benötigt <code>cookie</code>, <code>session</code> und <code>paula</code> Parameter
- <code>POST</code> <code>/login</code> Anmeldung mit SPH-Session bei Moodle
- <code>GET</code> <code>/check</code> Überprüfung der verschiedenen Tokens
- <code>GET</code> <code>/courses</code> Liste an Kursen
- <code>GET</code> <code>/events</code> Anstehende Abgaben und Termine
- <code>GET</code> <code>/conversations</code> Alle Unterhaltungen auflisten
- <code>GET</code> <code>/messages</code> Nachrichten innerhalb einer Unterhaltung
- <code>GET</code> <code>/notifications</code> Alte Benachrichtigungen anzeigen
- <code>GET</code> <code>/proxy</code> Geschützte Bilder in Moodle authentifiziert laden