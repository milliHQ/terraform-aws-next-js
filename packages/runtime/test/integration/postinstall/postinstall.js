#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Some packages like Prisma rely on the `NOW_BUILDER` environment variable
// to determine if the build is running with the Vercel builder

// Prisma: https://github.com/prisma/prisma/blob/1d0045fe60dc1992173f3f5be84b24129f0d45a3/src/packages/cli/scripts/install.js#L10
if (process.env.INIT_CWD && process.env.NOW_BUILDER) {
  fs.writeFileSync('public/prisma.txt', '');
}

if (process.env.INIT_CWD) {
  fs.writeFileSync(path.join(process.env.INIT_CWD, 'public/init-cwd.txt'), '');
}
