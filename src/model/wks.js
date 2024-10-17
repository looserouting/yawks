import {DataTypes} from 'sequelize';

const defineWks = (sequelize) => {
    const Wks = sequelize.define('Wks',
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

    return Wks;
};

export default defineWks;

/*
// defaultDomain: The mail server will have the host name openpgpkey.defaultDomain
// The public key will be published so we can receive encrypted mails. WDK will available under openpgp.defaultDomain.
// Verification links will use openpgp.defaultDomain. Because of that you'll need an entry in the Domain table for this domain.
dafaultDomain: positron-it.de 

// a wks client will get this Submission Address when checking for one. The mail server will only access mails send to this receipient.
submissionAddress: "key-submission@positron-it.de"

// this is the private key for submissinoAddress. the service needs this key to sign mails and to decrypt mails if encrypted
pgpprivkey: "./submission.key"
// password for decrypting the PGPPrivateKey if encrypted
pgppass:
// this ist the public key for the submissionAddress. This key will be automatically publish so we can receive encrypted mails.
pgppubkey: "./positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73"

// for SMTP server and default web cert if no cert for sni found. typecally it's for the same domains a defaultVerifyDomain
defaultServerCert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem"
defaultServerKey: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem" 

// SMTP Client
// set to true if you wand to use the sendmail to send mails. When set to true other SMTP options will be ignored
SMTPSendmail: true
// if you want to use an external server.
SMTPPort: 25
SMTPHost: 'postitron-it.de'
SMTPUser: 'yawksuser'
SMTPPassword: 'yakspassword'
*/
