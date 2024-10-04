const config = {
    datadir: "./",
    ServerDefaultKey: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem",
    ServerDefaultCert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem",
    pgpprivkey: "./submission.key",
    pgppubkey: "./positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73",
    pgpkeypass: '',
    smtp: {
        sendmail: true,
        mailaddress: "key-submission@positron-it.de",
        port: 25,
        host: '',
        auth: {
            user: '',
            pass: ''
        }
    },
    domains: {
        "positron-it.de": {
            cert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem",
            key:  "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem"
        },
        "example.eu": {
            cert: "./misc/domain.eu.server.cert",
            key:  "./misc/domain.eu.server.key"
        },
        "example.com": {
            cert: "./misc/domain.com.server.cert",
            key:  "./misc/domain.com.server.key"
        },
    }
};

export default config;