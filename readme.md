# kg-backend

[![](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Setup

    yarn

## Dev

Start local server on port `8080`:

    yarn serve

# Prod

Build for production:

    yarn build

## Now.sh

Deploy:

    yarn deploy

Add secrets:

    now secrets add my-app-mongo-url "user:password@mydb.com"

Add env variables:

    now -e MONGO_URL="user:password@mydb.com"

