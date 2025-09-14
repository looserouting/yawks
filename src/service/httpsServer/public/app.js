/* global openpgp */
// OpenPGP Key Generator - Client Side
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('keyForm');
    const generateBtn = document.getElementById('generateBtn');
    const progress = document.getElementById('progress');
    const results = document.getElementById('results');
    const publicKeyElement = document.getElementById('publicKey');
    const privateKeyElement = document.getElementById('privateKey');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const passphrase = document.getElementById('passphrase').value;

        if (!name || !email) {
            alert('Bitte geben Sie Name und E-Mail-Adresse ein.');
            return;
        }

        // Show progress
        generateBtn.disabled = true;
        progress.style.display = 'block';
        results.style.display = 'none';

        try {
            // Generate key pair
            const { publicKey, privateKey } = await generateKeyPair(name, email, passphrase);
            
            // Display results
            publicKeyElement.textContent = publicKey;
            privateKeyElement.textContent = privateKey;
            
            results.style.display = 'block';
            
        } catch (error) {
            console.error('Fehler bei der Schlüsselerstellung:', error);
            alert('Fehler bei der Schlüsselerstellung: ' + error.message);
        } finally {
            // Hide progress
            progress.style.display = 'none';
            generateBtn.disabled = false;
        }
    });

    async function generateKeyPair(name, email, passphrase) {
        console.log('Starte Schlüsselerstellung...');
        
        const userID = {
            name: name,
            email: email
        };

        const options = {
            userIDs: [userID],
            curve: 'ed25519',
            passphrase: passphrase || undefined
        };

        console.log('Generiere Schlüsselpaar mit Optionen:', {
            userIDs: options.userIDs,
            curve: options.curve,
            passphrase: passphrase ? '***' : 'none'
        });

        const { privateKey, publicKey } = await openpgp.generateKey(options);

        console.log('Schlüssel erfolgreich generiert');

        // Format keys as ASCII armor
        const publicKeyArmored = publicKey.armor();
        const privateKeyArmored = privateKey.armor();

        return {
            publicKey: publicKeyArmored,
            privateKey: privateKeyArmored
        };
    }

    window.downloadKey = function(keyElementId, filename) {
        const keyContent = document.getElementById(keyElementId).textContent;
        const blob = new Blob([keyContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    };

    // Add some helpful information
    console.log('OpenPGP Key Generator geladen');
    console.log('OpenPGP.js Version:', openpgp.version);
});
