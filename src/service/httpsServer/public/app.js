/* global openpgp */

let appConfig = null;

window.showTab = function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.getElementById('generateSection').style.display = tabId === 'generate' ? 'block' : 'none';
    document.getElementById('uploadSection').style.display = tabId === 'upload' ? 'block' : 'none';
    document.getElementById('searchSection').style.display = tabId === 'search' ? 'block' : 'none';
    document.getElementById('adminSection').style.display = tabId === 'admin' ? 'block' : 'none';
    document.getElementById('infoSection').style.display = tabId === 'info' ? 'block' : 'none';
    document.getElementById('results').style.display = 'none';
};

window.copyToClipboard = async function(id) {
    const text = document.getElementById(id).textContent;
    await navigator.clipboard.writeText(text);
    alert('Kopiert!');
};

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch configuration
    try {
        const response = await fetch('/api/config/info');
        appConfig = await response.json();
        document.getElementById('revokerId').textContent = appConfig.corporate_revocation_fingerprint.slice(-16);
        document.getElementById('currentDomain').textContent = appConfig.domains[0];
        
        // Populate Info Section
        const infoRevoker = document.getElementById('infoRevoker');
        if (infoRevoker) infoRevoker.textContent = appConfig.corporate_revocation_fingerprint;
        
        const infoDomains = document.getElementById('infoDomains');
        if (infoDomains) infoDomains.textContent = appConfig.domains.join(', ');
    } catch (err) {
        console.error('Failed to load config:', err);
    }

    // Admin URL check
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
        showTab('admin');
    }

    const generateForm = document.getElementById('generateForm');
    const uploadForm = document.getElementById('uploadForm');
    const spinner = document.getElementById('spinner');
    const results = document.getElementById('results');

    generateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const passphrase = document.getElementById('passphrase').value;

        try {
            // 1. Generate Key
            const { privateKey, publicKey } = await openpgp.generateKey({
                type: 'ecc',
                curve: 'ed25519',
                userIDs: [{ name, email }],
                passphrase
            });

            // 2. Inject Revoker
            const modifiedPubKey = await injectRevoker(privateKey, publicKey, passphrase);
            
            // 3. Create Ownership Proof (Sign a challenge)
            const challenge = `Registering PGP key for ${email} at ${new Date().toISOString()}`;
            const signature = await createOwnershipProof(privateKey, passphrase, challenge);

            // 4. Display
            displayResults(modifiedPubKey, privateKey);
            
            // 5. Automatic submission to API
            await submitKeyToServer(modifiedPubKey, email, signature, challenge);
            
        } catch (err) {
            alert('Fehler: ' + err.message);
        } finally {
            setLoading(false);
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);

        const keyText = document.getElementById('existingKey').value;
        const passphrase = document.getElementById('uploadPassphrase').value;

        try {
            // Determine if it's a private or public key
            let privateKey = null;
            let publicKey = null;

            if (keyText.includes('PRIVATE KEY')) {
                privateKey = keyText;
                const privKeyObj = await openpgp.readPrivateKey({ armoredKey: privateKey });
                publicKey = privKeyObj.toPublic().armor();
            } else {
                publicKey = keyText;
                alert('Um einen Revoker hinzuzufügen, wird der private Schlüssel benötigt (nur lokal im Browser).');
                setLoading(false);
                return;
            }

            const modifiedPubKey = await injectRevoker(privateKey, publicKey, passphrase);
            
            const challenge = `Uploading PGP key for ${document.getElementById('email').value} at ${new Date().toISOString()}`;
            const signature = await createOwnershipProof(privateKey, passphrase, challenge);

            displayResults(modifiedPubKey, privateKey);

            // Automatic submission
            await submitKeyToServer(modifiedPubKey, document.getElementById('email').value, signature, challenge);

        } catch (err) {
            alert('Fehler beim Verarbeiten des Schlüssels: ' + err.message);
        } finally {
            setLoading(false);
        }
    });

    document.getElementById('searchBtn').addEventListener('click', async () => {
        const query = document.getElementById('searchInput').value;
        if (query.length < 3) return alert('Bitte mindestens 3 Zeichen eingeben');

        setLoading(true);
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            
            const resultsContainer = document.getElementById('searchResults');
            resultsContainer.innerHTML = '';

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Keine Ergebnisse gefunden.</p>';
            } else {
                results.forEach(key => {
                    const card = document.createElement('div');
                    card.className = 'key-box';
                    card.style.marginBottom = '1rem';
                    card.innerHTML = `
                        <div style="font-weight:600">${key.email}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted)">Fingerprint: ${key.fingerprint}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted)">Erstellt: ${new Date(key.keycreationtime).toLocaleDateString()}</div>
                        <a href="/.well-known/openpgpkey/${key.domain}/hu/${key.wkdHash}" download="${key.email}.pub" class="btn" style="margin-top:0.5rem; display:inline-block; font-size:0.8rem; padding:4px 12px; width:auto">Download Public Key</a>
                    `;
                    resultsContainer.appendChild(card);
                });
            }
        } catch (err) {
            alert('Fehler bei der Suche: ' + err.message);
        } finally {
            setLoading(false);
        }
    });

    document.getElementById('revokeBtn').addEventListener('click', async () => {
        const email = document.getElementById('revokeEmail').value;
        const adminKey = document.getElementById('adminKey').value;
        const adminPrivKey = document.getElementById('adminPrivKey').value;
        const adminPassphrase = document.getElementById('adminPassphrase').value;

        if (!email || !adminKey || !adminPrivKey) return alert('Bitte alle Felder ausfüllen');

        setLoading(true);
        try {
            // In a real scenario, we would generate a 0x20 signature here.
            // For this demo, we'll send a placeholder signature to the protected API.
            // The server will then mark the key as revoked.
            const response = await fetch('/api/admin/revoke', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey
                },
                body: JSON.stringify({ 
                    email, 
                    revocationSignature: 'REVO_SIG_PLACEHOLDER' 
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            alert(`Schlüssel für ${email} wurde erfolgreich widerrufen.`);
        } catch (err) {
            alert('Widerruf fehlgeschlagen: ' + err.message);
        } finally {
            setLoading(false);
        }
    });
});

function setLoading(isLoading) {
    document.getElementById('spinner').style.display = isLoading ? 'block' : 'none';
    document.getElementById('generateBtn').disabled = isLoading;
    document.getElementById('uploadBtn').disabled = isLoading;
    document.getElementById('results').style.display = 'none';
}

function displayResults(pubKey, privKey) {
    document.getElementById('pubKeyDisplay').textContent = pubKey;
    document.getElementById('privKeyDisplay').textContent = privKey;
    document.getElementById('results').style.display = 'block';
    document.getElementById('privKeyBox').style.display = privKey ? 'block' : 'none';
}

/**
 * Low-level injection of the Designated Revoker subpacket
 */
async function injectRevoker(armoredPrivKey, armoredPubKey, passphrase) {
    console.log('Injecting Corporate Revoker...');

    // 1. Prepare Keys
    const privKeyObj = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });
    const decryptedPrivKey = await openpgp.decryptKey({
        privateKey: privKeyObj,
        passphrase
    });

    const pubKeyObj = await openpgp.readKey({ armoredKey: armoredPubKey });
    const packets = pubKeyObj.toPacketList();

    // 2. Revoker Info from Config
    // Fingerprint must be a Uint8Array (20 bytes for v4 keys)
    const fpString = appConfig.corporate_revocation_fingerprint.replace(/\s/g, '');
    const revokerFingerprint = new Uint8Array(fpString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const revokerAlgorithm = appConfig.corporate_revocation_algorithm;
    const revokerClass = 0x80; // Standard

    // 3. Find and Modify the Self-Signature (Type 0x13)
    let injected = false;
    for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        if (packet.constructor.name === 'SignaturePacket' && packet.signatureType === 0x13) {
            
            packet.revocationKeyClass = revokerClass;
            packet.revocationKeyAlgorithm = revokerAlgorithm;
            packet.revocationKeyFingerprint = revokerFingerprint;

            // Re-sign the packet
            // We need the primary key and user ID for the signature data
            const primaryKeyPacket = packets.find(p => p.constructor.name === 'PublicKeyPacket');
            const userIDPacket = packets.find(p => p.constructor.name === 'UserIDPacket');
            
            // In v6, SignaturePacket.sign expects (signingKeyPacket, dataToSign)
            // Data for 0x13 is { key, userID }
            await packet.sign(decryptedPrivKey.primaryKey, {
                key: primaryKeyPacket,
                userID: userIDPacket
            });
            
            injected = true;
            break;
        }
    }

    if (!injected) {
        throw new Error('Selbistsignatur (Type 0x13) nicht gefunden. Revoker konnte nicht injiziert werden.');
    }

    // 4. Return armored modified public key
    const modifiedKey = openpgp.Key.fromPacketList(packets);
    return modifiedKey.armor();
}

async function submitKeyToServer(armoredPublicKey, email, signature, challenge) {
    console.log('Submitting key to server...');
    const response = await fetch('/api/key/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            publicKey: armoredPublicKey, 
            email,
            signature,
            challenge
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('Server-Fehler bei Registrierung: ' + error);
    }

    console.log('Key submitted successfully');
}

async function createOwnershipProof(armoredPrivKey, passphrase, challenge) {
    console.log('Creating ownership proof...');
    
    const privKeyObj = await openpgp.readPrivateKey({ armoredKey: armoredPrivKey });
    const decryptedPrivKey = await openpgp.decryptKey({
        privateKey: privKeyObj,
        passphrase
    });

    const message = await openpgp.createMessage({ text: challenge });
    const signature = await openpgp.sign({
        message,
        signingKeys: decryptedPrivKey,
        detached: true
    });

    return signature;
}
