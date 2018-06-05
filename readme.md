
# kg-backend

> Node.js backend for experiments.

[![Uptime Robot ratio (30 days)](https://img.shields.io/uptimerobot/ratio/m780525365-2967f3b0d1a019d3b6a379da.svg?style=flat-square)](https://stats.uptimerobot.com/LvXvNC2j5)
![](https://circleci.com/gh/kirillgroshkov/kg-backend.svg?style=shield&circle-token=77341500f3a17b11e8ee48350ba5032c261ffc77)
[![](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

Currently powers:

- [Releases](https://releases.netlify.com)
- [SL dashboard](https://sl-dashboard.netlify.com)
- ...

# Stack

- Node.js
- Typescript
- Koa
- Firebase (Auth, Firestore)
- Jest
- Hosted at amazing Now.sh

# Develop

    yarn

    yarn serve

    yarn build

## Now.sh

Deploy:

    yarn deploy

Add secrets:

    now secrets add my-app-mongo-url "user:password@mydb.com"

Add env variables:

    now -e MONGO_URL="user:password@mydb.com"
