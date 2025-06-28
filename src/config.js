export default {
    mail: 'sendmail',
    smtp_mailaddress: 'key-submission@positron-it.de',
    smtp_port: 25,
    smtp_host: null,
    smtp_authuser: null,
    smtp_authpass: null,
    directory: '/var/www/yawks/public',
    domains: {
        'openpgpkey.positron-it.de': {
            DomainCert: '/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem',
            DomainKey: '/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem',
            pgpprivkey: './submission.key',
            pgppubkey: './positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73',
            pgpkeypass: null
        }
    },
  database_uri: 'sqlite://db.sqlite'
}
