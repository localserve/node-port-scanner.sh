# @localserve/node-port-scanner.sh

A painfully slow scanner; even after cluster; but hey it's in node.js.

It's slow, not by design but by the virtue of JS being high level.

It's at least 10 times slower than nmap.

## Things to note

### Only localhost

Yes. We are testing only localhost.

Please raise a PR if you want to use it to test networked machines.

Though, why? Just use `nmap`.

### tsconfig

1. "noImplicitUseStrict": true,
2. "alwaysStrict": false,

These allow us to use TS based executable, and because of these settings, the `"use strict"` is not thrown.
