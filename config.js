const config = {
    datadir: "/var/lib/gnupg/wks",
    ServerDefaultKey: "./misc/domain.eu.server.key",
    ServerDefaultCert: "./misc/domain.eu.server.cert",
    smtp: {
        pgpcert: "./misc/domain.eu.pgp.cert",
        pgpkey: "./misc/domain.eu.pgp.key",
        mailaddress: "key-submission@domain.eu"
    },
    domains: {
        "example.eu": {
            cert: "./misc/domain.eu.server.cert",
            key:  "./misc/domain.eu.server.key"
        },
        "example.com": {
            cert: "./misc/domain.com.server.cert",
            key:  "./misc/domain.com.server.key"
        },
        "web.de": {
            cert: null,
            key: null
        }
    }
};

export default config;