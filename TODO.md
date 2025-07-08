# 1. Search for key on website

# 2. revoke key
## 2.1. steps for revoking
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
## 2.2. Problem
User needs to update their keys
# 3. create openPGP Key in website and submit a request direcly using web api
When unsing the Webinterface to create a Key, we could add our user as revoker
Example code:
```
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>PGP Schlüsselgenerator mit Revoker</title>
  https://unpkg.com/openpgp@latest/dist/openpgp.min.js
</head>
<body>
  <h2>OpenPGP-Schlüssel generieren</h2>
  <form id="pgpForm">
    <label for="email">E-Mail-Adresse:</label>
    <input type="email" id="email" required><br><br>

    <label for="passphrase">Passwort für privaten Schlüssel:</label>
    <input type="password" id="passphrase" required><br><br>

    <button type="submit">Schlüssel generieren</button>
  </form>

  <script>
    const dummyServerPublicKeyArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js FAKE

mQENBFzvKZUBCAC3ZJZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZK
XvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZKXvKZ
=FAKE
-----END PGP PUBLIC KEY BLOCK-----`;

    document.getElementById('pgpForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const passphrase = document.getElementById('passphrase').value;

      if (!passphrase || passphrase.length < 6) {
        alert("Bitte gib ein sicheres Passwort mit mindestens 6 Zeichen ein.");
        return;
      }

      // Lade Server-Schlüssel
      const serverKey = await openpgp.readKey({ armoredKey: dummyServerPublicKeyArmored });
      const serverKeyID = serverKey.getKeyIDs()[0];

      // Generiere Benutzerschlüssel (ohne User ID Signatur)
      const { key } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 2048,
        userIDs: [{ email }],
        passphrase: passphrase,
        format: 'object',
        config: { signUserIDs: false } // wir signieren gleich manuell
      });

      // Signiere User ID mit Revocation Key Subpacket
      const user = key.getUserIDs()[0];
      const primaryUser = await key.getPrimaryUser();

      await key.signPrimaryUser([{
        userID: primaryUser.user.userID,
        key: key,
        date: new Date(),
        subpackets: {
          revocationKey: [{
            class: 0x80, // sensitive revoker
            algorithm: serverKey.getAlgorithmInfo().algorithmID,
            fingerprint: serverKey.getFingerprint()
          }]
        }
      }]);

      // Exportiere Schlüssel
      const armoredPublicKey = await key.toPublic().armor();
      const armoredPrivateKey = await key.armor();

      // Download-Funktion
      function download(filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }

      download('publicKey.asc', armoredKey);
      download('privateKey.asc', armoredPrivateKey);
    });
  </script>
</body>
</html>
```

# 4. Make `gpg-wks-client create` work
# 5. Better error handling
remove console.log()'s and write logs into file
# 6. check/verify mail that reqest is signed
# 7. missing
## ✅ Im RFC spezifiziert und in yawks nur teilweise implementiert
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
