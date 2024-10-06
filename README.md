# Yet Another Web Key Service
---------------------------
<mark>This Code is not fully tested yet</mark>

This is another approach for a web key service which is also a web key directory.

YAWKS (Yet Another Web Key Service) is an open-source web key service and directory for managing OpenPGP keys. It aims to simplify the process of storing and validating keys for email encryption and signature verification. Users can easily add their OpenPGP keys to the service by validating their email addresses through a simple key submission process.

<mark>This WKS is working an described in https://datatracker.ietf.org/doc/html/draft-koch-openpgp-webkey-service-18</mark>

# Setup Guide
------------

## Prerequisites
- Node.js
- npm 
- GnuPG 

## Download yawks and install modules

```
cd /var/www
git clone https://github.com/looserouting/yawks.git yawks
cd yawks
npm install
```

## DNS records

example for domain positron-it.de

```
.           MX  openpgpkey.positron-it.de
openpgpkey  A   <yawks server IP>
```

You probably need to add the server IP to your SPF record

DKIM is not supported right now.

### Create SSL certificate for yawks using certbot
This certificate will be used by the mail server but it will also be used as the default certificate for the web server. The verification links will contain this domain.

Install certbot if it's not already there.
Then use the following command:

```
certbot certonly --standalone -n --agree-tos -m administrator@positron-it.de \
      -d openpgpkey.positron-it.de
```

### Create submission key and publish it
The server will send a signed mail with the validation link. For signing a key is needed which  needs to published so a MTA can verify the sender of that mail. 

To create the key:
```
gpg --batch --passphrase '' --quick-gen-key key-submission@positron-it.de
```

Then get the wdk hash

```
gpg --with-wkd-hash -K key-submission@positron-it.de
```

The output of the last command looks similar to this:
```
sec   ed25519 2024-10-04 [SC] [expires: 2027-10-04]
      B05AE83B237E5A8CC233D641B6586E5B8599779C
uid           [ultimate] key-submission@positron-it.de
              54f6ry7x1qqtpor16txw5gdmdbbh6a73@positron-it.de
ssb   cv25519 2024-10-04 [E]

```

Take the hash of the string “key-submission”, which is 54f6ry7x1qqtpor16txw5gdmdbbh6a73 and manually publish that key:

```
mkdir -p /var/www/yawks/positron-it.de/hu
gpg -o /var/www/yawks/positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73 \
    --export-options export-minimal --export key-submission@positron-it.de
```

The private key which will be used for signing can be exported to the working directory

```
gpg --output /var/www/yaks/submission.key --armor \
    --export-secret-key key-submission@positron-it.de
```

## Configuration

Rename `config.js.example` to `config.js` and modify the configuration to your needs.

Your configuration file could look like this
```
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
        }
    }
};

export default config;
```

<mark>The configuration part will be rewritten. It's really upgly. But for now it will do his job.</mark>

If you set the `sendmail: true` in the `smtp` section then `host`, `port` and `auth` will be ignored.

The smtp server will only accept mails from known domains which are send to the `smtp.mailaddress`.

You can add more domains if you want to host keys for other domains. You will also need to add an A record for openpgpkey for this domains.

## Allow node to bind to privileged ports

```
setcap 'cap_net_bind_service=+ep' $(which node)
```

# Usage

To submit a key:

- Send an email to the YAWKS server with your OpenPGP key attached.
- Follow the validation link sent to your email. 

# Contributing

Contributions are welcome! Feel free to open an issue for any bugs or feature requests, or submit a pull request to improve the codebase. Please refer to our Issues page for ongoing discussions and tasks.