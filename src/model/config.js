import {DataTypes} from 'sequelize';

const defineConfig = (sequelize) => {
    const Config = sequelize.define('Config',
    {
        parameter: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    });

    return Config;
};

export default defineConfig;



/*
// WDK will available under openpgp.defaultDomain. The public key will be published here so we can receive encrypted mails.
// Verification links will use openpgp.defaultDomain. Because of that you'll need an entry in the Domain table for this domain.
dafaultDomain: positron-it.de 
//When enabled the server will accept key for all domain ans will create a directory for each domain
acceptAllKeys: false
// a wks client will get this Submission Address when checking for one. The mail server will only access mails send to this receipient.
submissionAddress: "key-submission@positron-it.de"

// this is the private key for submissinoAddress. the service needs this key to sign mails and to decrypt mails if encrypted
pgpprivkey: "./submission.key"
// password for decrypting the PGPPrivateKey if encrypted
pgppass:
// this ist the public key for the submissionAddress. This key will be automatically publish so we can receive encrypted mails.
pgppubkey: "./positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73"

// for SMTP server and default web cert if no cert for sni found. typecally it's for the same domains a defaultVerifyDomain
defaultServerKey: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem" 
defaultServerCert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem"

// SMTP Client
// set to true if you wand to use the sendmail to send mails. When set to true other SMTP options will be ignored
SMTPSendmail: true
// if you want to use an external server.
SMTPPort: 25
SMTPHost: 'postitron-it.de'
SMTPUser: 'yawksuser'
SMTPPassword: 'yakspassword'
*/
