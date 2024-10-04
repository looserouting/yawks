# Yet Another Web Key Service
---------------------------
<mark>This Code is Work in Progress and not functioning yet</mark>

This is another aproach for an web key service which is also a web key directory.

The idea is that anybody can add his OpenPGP Key to this server by validating his mail address by sending an mail to the server with his key in it and klicking on a link send to his mail address.

A MUA can so search for the key to write encrypted mails.

<mark>This is not following https://datatracker.ietf.org/doc/html/draft-koch-openpgp-webkey-service-18</mark>

The reason why I want to write this applicaion is because I didn't find an easy way to add keys to a Web Key Directory. 

# Setup Guide
------------

You need nodejs and npm installed

## Download yawks and install modules

```
cd /var/www
git clone https://github.com/looserouting/yawks.git yawks
cd yawks
npm install
```

## DNS records

```
openpgpkey  MX  openpgpkey.positron-it.de
openpgpkey  A   <yawks server IP>
```

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

Your configuration file should look like this
```
const config = {
    datadir: "./",
    ServerDefaultKey: "/etc/letsencrypt/live/openpgpkey.positron-it.de/privkey.pem",
    ServerDefaultCert: "/etc/letsencrypt/live/openpgpkey.positron-it.de/cert.pem",
    pgpprivkey: "./submission.key",
    pgppubkey: "./positron-it.de/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a73",
    pgpkeypass: '',
    smtp: {
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

the `smtp` section is for sending mails to a real mail server for delivering.
The smtp server will only accept mails from known domains which are send to the `smtp.mailaddress`.

You can add more doamins if you want to host keys for other domains. You will also need to add an A record for openpgpkey for this domain.

## Allow node to bind to privileged ports

```
setcap 'cap_net_bind_service=+ep' $(which node)
```