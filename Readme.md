## Whitelist your current IP in related Mongo / AWS projects

### Helpful tool for heavy VPN users whose IP changes very frequently

Requirements:
- MongoDB
  - Just user account with permission to modify `IP Access List`
- AWS
  - you will need two secrets listed below:
  - aws access key id
  - aws secret access key
  - and also Id of security group that this will update
  - (probably permission to update this security group)

```sh
cd ./scripts
npm install
```

Follow the steps in each one to connect your accounts
```sh
npm run add-mongo
aws configure --profile whitelist-me
```

Then go to `./scripts/config.json` and verify value of `ipComment` to be the `description` field that you want your IP entries to have
Also veriry `securityGroupId` of AWS related config

Then execute, it will read the config and use connected account to whitelist current IP

```sh
./whitelist.bat
```

Or

```
./whitelist.sh
```


----

p.s. whole thing was vibecoded, but it works xD