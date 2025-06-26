# read initdbconfig file to create database if database does not exist

# Search for key on website

# keyserver 
have to check the documentation how this works

`keys.defaultDomain`

`keyServer`: When enabled the server will accept keys for all domains. it will create a directory for each domain
// It will also create a subdomain keyserver.defaultDomain. 
```
keyServer: false
keyServerWebSearch: false
```
// If you don't use you a wildcard certificate you can enter here certificats an keys for this subdomain
```
keyServerCert: null
keyServerKey: null
```

# revoke key

## steps for revoking

The following assumes that the key server is pgp.mit.edu.

List keys
```
gpg --list-keys
```

Revoke your key
```
gpg --output revoke.asc --gen-revoke key-ID
```

Import revocation certificate into your keyring
```
gpg --import revoke.asc
```

Send the revoked key to the key-server
```
gpg --keyserver pgp.mit.edu --send-keys key-ID
```
## Problem

User needs to update their keys

## possible solution
Add user id of keyserver as revoker to the key and sign it
The goal is that the server can revoke that key.

# Make `gpg-wks-client create` work

# Use database for storing keys and meta info

- maybe we could check for outdated keys and remove them
- scalability

# Better error handling

remove console.log()'s and write logs into file

# check varify mail if reqest is signed

# missing
## ✅ Im RFC spezifiziert und in yawks nur teulweise implementiert
### Advanced Discovery
```GET https://openpgpkey.<domain>/.well‑known/openpgpkey/<domain>/hu/<hash>?l=<uid>```
Ermöglicht Clients Key-Abfrage über Subdomain.
In der Router steht nichts von `?l=<uid>`

### Direct Discovery
```GET https://<domain>/.well‑known/openpgpkey/hu/<hash>?l=<uid>```
Direct Discovery ist ein Fallback-Methode, wenn Advanced nicht verfügbar ist.
Das berührt uns nicht.

### Key Retrieval (GET)
Liefert den binären OpenPGP-Schlüssel (application/octet-stream) 
yawks deckt GET-Aufrufe ab und liefert den Schlüssel direkt aus dem Speicher.

### HTTP HEAD Support
Clients dürfen vorher HEAD absetzen, um Existenz zu prüfen 
yawks unterstützt standardmäßig HEAD-Anfragen, da es Node/Express nutzt (prüfen und korrigieren).

### Policy Flags
```GET /.well-known/openpgpkey/<domain>/hu/policy```
Muss Policy-Datei mit JSON-Flags liefern 
yawks includiert diese Datei (im Repo), die route fehlt

## ⚠️ Im RFC spezifiziert, aber von yawks nicht oder ungenügend implementiert
### HKPS Discovery (hkps Datei)
```GET https://openpgpkey.<domain>/.well‑known/openpgpkey/<domain>/hkps```
RFC beschreibt als optional für HKPS-Zertifikat-Service 
Das kennen ich nicht
yawks bietet diese Datei nicht – kein HKPS redirect-Service.

### Content-Type Richtlinien
Soll application/octet-stream liefern (kein ASCII-Armoring) 
yawks liefert Key im Binärformat, aber es fehlt:
Eindeutiger Content-Type (evtl verwendet application/pgp-keys).
CORS-Header (Access-Control-Allow-Origin) wird nicht gesetzt – wichtig für Browser-/Web-Clients 
```
Content-Type: application/octet-stream
Access-Control-Allow-Origin: *
```

### Verarbeitung mehrerer User IDs
RFC verlangt, dass nur User ID für Anfrage-Adresse ausgeliefert wird 
yawks speichert ganze Keys — es fehlt Filterung, um unerwünschte IDs zu entfernen.


# More suggestions
## 1. CORS-Header (Access-Control-Allow-Origin)
Der Draft erwähnt zwar keine CORS, aber moderne Browser‑Plugins und Web‑Clients scheitern häufig ohne Access-Control-Allow-Origin: * .
Verbesserung: Den Server so konfigurieren, dass auf Policy‑ und Key-Responses stets Access-Control-Allow-Origin: * gesetzt wird.
## 2. Advanced vs. Direct Discovery
Der Draft empfiehlt zuerst "Advanced" (Subdomain openpgpkey.domain), dann bei 404 fallback auf "Direct" (ohne Subdomain).
In der Realität fehlen oft Tests oder Warnungen bei Clients, die nur Direct nutzen .
Optimierung:
Logging & Monitoring, welches Verfahren greift.
Tools oder Beispielskripte, um die Konfiguration zuverlässig zu prüfen.
## 3. Policy Flags + Validator-Tooling
Der Server muss eine Policy-Datei (/hu/policy) ausliefern.
Aktuelle Tools (z. B. metacode’s WKD-Checker) testen neben Syntax auch CORS und HTTP-Status .
Empfehlung: Aufnahme eines eigenen Validator-Skripts in yawks, das:
policy validiert,
200/HEAD-Status prüft,
Content-Type und CORS testet,
expired/revoked Keys erkennt.
## 4. Post-Quantum & moderne Keyformate
Laut Nutzerdiskussionen wird in Drafts bald PQ-Subkeys und Ed25519/Curve25519 als Pflicht eingeführt .
Vorschlag: yawks um Unterstützung für moderne OpenPGP-Schlüsselformate erweitern:
Bsplw. Erkennung und Auslieferung von EdDSA/ECDH/PQ‑Subkeys,
Warnungen oder Logging bei RSA < 3072 Bit.
## 5. Padding & Traffic Analysis
Der Draft erwähnt Padding‑Pakete (Traffic‑Analysis-Schutz), aber Kritik weist auf covert-channel‑Problematik hin .
Empfehlung: optional konfigurierbares Padding:
Mit deterministischem (verifiable seed) oder
Ohne (für auditfähig).
Punktuelle Empfehlungen in Docs/Defaults.
## 6 Tests, Monitoring & Logging
Ergänzungen um:
Unit-Tests für Hash-Generierung, URL-Encoding,
Integrationstest mit echten WKD-Clients (z. B. GnuPG),
Prometheus‑Metrics (Anfragen, Fehler, Latenz).

Beispielübersicht
Thema | Verbesserungsvorschlag |
--- | --- |
CORS |Access-Control-Allow-Origin: * hinzufügen
HTTP HEAD | HEAD-Anfragen zuverlässig unterstützen
Validator | Tool zur Prüfung SSL, Headers, Policy, Schlüssel
Keyformate | PQ/EdDSA/ECDH Unterstützung & Warnung vor veraltetem RSA
Padding | Optionales Padding mit Security-Optionen
Tests & Monitoring | Automatisierte Tests & Prometheus-Metrics

Fazit
yawks ist ein starker Startpunkt für den WKD/Dienst gemäß IETF-Draft. Um ihn noch robuster und produktionsreif zu machen, lohnt es sich vor allem, CORS, Handling, Validator‑Tooling, sowie moderne Keyformate und Observability zu optimieren.
