# 🔓 Let Me In

One-click IP whitelist for MongoDB & AWS security groups.  

---

TLDR; Create & Update just single dedicated entry in your IP access list in the project

---

## Requirements

**MongoDB**
- User account with permission to modify `IP Access List`

**AWS**
- Access Key ID & Secret Access Key
- Security Group ID you want to update
- Permission to modify that security group

---

## Setup

```sh
cd ./scripts
npm install
```

Follow the steps in each one to connect your accounts
```sh
npm run add-mongo
aws configure --profile whitelist-me
```

In case of AWS make sure to use the same name everywhere, i.e. whitelist-me

## One time check

Go to `./scripts/config.json` and verify value of `ipComment` to be the `description` field that you want your IP entries to have.

Also veriry `securityGroupId` of AWS related config



## Daily Usage


Execute this, it will read the config and use connected account to whitelist current IP.

```sh
./whitelist.bat
```

Or

```
./whitelist.sh
```


----

p.s. whole thing was vibecoded, but it works xD