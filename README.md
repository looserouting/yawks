# Yet Another Web Key Service
---------------------------
<mark>This Code is Work in Progress and not functioning yet</mark>

This is another aproach for an web key service which is also a web key directory.

The idea is that anybody can add his OpenPGP Key to this server by validating his mail address by sending an mail to the server with his key in it and klicking on a link send to his mail address.

A MUA can so search for the key to write encrypted mails.

<mark>This is not following https://datatracker.ietf.org/doc/html/draft-koch-openpgp-webkey-service-18</mark>

The reason why I want to write this applicaion is because I didn't find an easy way to add keys to an Web Key Directory. 

# Installation
------------

## Preparations

Create a directory where the keys will be stored
`mkdir /var/lib/gnupg/yawks`

### Create submission key
The server will send a signed mail with the validation link. for signing a key is needed which need to published.
```
gpg --batch --passphrase '' --quick-gen-key key-submission@example.org
```

### Publish signing key
Get the wdk hash
```
gpg --with-wkd-hash -K key-submission@example.org
```

The output of the last command looks similar to this:
```
sec   rsa2048 2017-08-31 [SC]
      C0FCF8642D830C53246211400346653590B3795B
uid           [ultimate] key-submission@example.org
              54f6ry7x1qqtpor16txw5gdmdbbh6a74@example.org
ssb   rsa2048 2017-08-31 [E]
```

Take the hash of the string “key-submission”, which is 54f6ry7x1qqtpor16txw5gdmdbbh6a74 and manually publish that key:

```
gpg -o /var/lib/gnupg/wks/example.org/hu/54f6ry7x1qqtpor16txw5gdmdbbh6a74 \
  --export-options export-minimal --export key-submission@example.org
```

## DNS Records

```
openpgpkey.example.com      A      <server_ip>
```

## Allow node to bind to privileged ports

```
setcap 'cap_net_bind_service=+ep' $(which node)
```
