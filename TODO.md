# read initdbconfig file to create database if database does not exist

# Search for key on website

# keyserver 
have to check the documentation how this works
keys.defaultDomain 
// keyServer: When enabled the server will accept keys for all domain ans will create a directory for each domain
// It will also create a subdomain keyserver.defaultDomain. 
keyServer: false
keyServerWebSearch: false
// If you don't you a wildcard certificate you can enter here certificats an keys for this subdomain
keyServerCert: null
keyServerKey: null

# revoke key

## steps for revoking

The following assumes that the key server is pgp.mit.edu.

List keys
```
gpg --list-keys
```

Revoke your key
```
gpg --output revoke.asc --gen-revoke key-ID
```

Import revocation certificate into your keyring
```
gpg --import revoke.asc
```

Send the revoked key to the key-server
```
gpg --keyserver pgp.mit.edu --send-keys key-ID
```
## Problem

User needs to update their keys

# Make `gpg-wks-client create` work

# Use database for storing keys and meta info

- maybe we could check for outdated keys and remove them
- scalability

# Better error handling

remove console.log()'s and write logs into file

# check varify mail if reqest is signed