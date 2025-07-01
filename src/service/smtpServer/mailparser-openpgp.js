import { simpleParser } from 'mailparser';
import * as openpgp from 'openpgp';

export default function openpgpMailDecrypt(data, options, callback) {

    let opt = {
        skipHtmlToText: true,
        skipTextToHtml: true,
        skipTextLinks: true
    };

    simpleParser(data, opt, async (err, parsed) => {
        if (err) {
            console.error('Error parsing email:', err);
            return callback (new Error('Error parsing message'));
        }

        // Extract headers
        const headers = parsed.headers;
        const contentType = headers.get('content-type');

        if (contentType.value !== 'multipart/encrypted') {
            //mail is not encrypted. Just return the parsed message. nothing else to do.
            return callback(null, parsed);
        }

        if (parsed.attachments[0].contentType !== 'application/pgp-encrypted') {
            return callback(new Error('First part is not of type application/pgp-encrpyptet. Probably not encrypted with openpgp'));
        }

        if (parsed.attachments[1].contentType !== 'application/octet-stream') {
            return callback(new Error('Encrypted message(application/octet-stream) not found'));
        }

        //decrypt using privateKey
        const privateKey = await openpgp.readPrivateKey({ armoredKey: options.privateKeyArmored });

        // decrypt private key if it is encrypted
        let decryptedPrivateKey;
        const passphrase = options && options.passphrase;

        if (!privateKey.isDecrypted()) {
            console.log('Key is encrypted');
            decryptedPrivateKey = await openpgp.decryptKey({
                privateKey,
                passphrase
            });
        } else {
            // Use the private key as is if it is already decrypted
            decryptedPrivateKey = privateKey;
        }

        const message = await openpgp.readMessage({
            armoredMessage: parsed.attachments[1].content.toString()
        });


        const { data: decryptedMail } = await openpgp.decrypt({
            message,
            decryptionKeys: decryptedPrivateKey,
        });

        // Construct new email data with original headers (excluding Content-Type) and decrypted body
        let newEmailData = '';
        for (const [key, value] of parsed.headers) {
            if (key.toLowerCase() !== 'content-type') {
                newEmailData += `${key}: ${value}\r\n`;
            }
        }
        newEmailData += decryptedMail;

        console.log(newEmailData);

        simpleParser(newEmailData, opt, (err, parsed) => {
            if (err) {
                console.error('Error parsing email:', err);
                return callback (new Error('Error parsing message'));
            }
            callback(null, parsed);
        })
    });
}