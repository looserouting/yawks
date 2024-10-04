const config = {
    datadir: "./wkd",
    ServerDefaultKey: "./misc/domain.eu.server.key",
    ServerDefaultCert: "./misc/domain.eu.server.cert",
    pgpprivkey: "./misc/domain.eu.pgp.cert",
    pgppubkey: "./misc/domain.eu.pgp.key",
    pgpkeypass: '',
    smtp: {

        mailaddress: "key-submission@domain.eu",
        port: 25,
        host: '',
        auth: {
            user: '',
            pass: ''
        }
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
    }
};

export default config;