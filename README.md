
# Asynchronous Local Storage ( UN-Hooked )

### This is a fork of [cls-hooked](cls) using [AsyncLocalStorage](AsyncLocalStorage) instead of [async_hooks](ah).

Since the Node team now discourages the use of [async_hooks](ah),
this package aims to provide a drop-in replacement for cls-hooked using async_hooks successor,
the [AsyncLocalStorage](AsyncLocalStorage) API (which is officially stable, by the way).

### Modern vs Legacy
> **TL;DR** If you're using [sequelize v6](v6) or just want a nice AsyncLocalStorage implementation,
> use the modern API. If you need a drop-in replacement for cls-hooked for use with something
> other than sequelize, you probably want the Legacy API.

The package has 2 different APIs: modern and legacy. The legacy API is a total drop-in replacement
for [cls-hooked](cls-hooked). In accomplishing this, it creates alot of additional overhead,
relies on globals, and (optionally) utilizes [monkeypatching](emitter-listener). To eliminate these,
a minimal wrapper of AsyncLocalStorage was created to be
  1. Easy to use
  2. Compatible with sequelize

### Use with Sequelize (v6)
A major motivator in creating this package was for use with [sequelize v6](v6),
which uses cls-hooked for [automatic transaction passing](autotxn).
This package is not officially supported by sequelize at this time, but the modern API
has been designed to be compatible with sequelize's implementation of cls-hooked.
```javascript
// app.js

import { Sequelize } from 'sequelize';
import { ALS } from 'als-unhooked';

Sequelize.useCLS(new ALS());
```

The legacy API is, of course, also compatible with sequelize. But the modern API is
recommended as it is more performant.

---
### Overview

`AsyncLocalStorage` is similar to thread-local storage in other programming environments. It allows you to store data that is scoped to the lifetime of an asynchronous operation, making it possible to maintain context across various asynchronous calls. This is particularly useful in scenarios where you need to track request-specific data throughout the lifecycle of a request in a web server, such as user authentication details or request IDs.

Suppose you use middleware to authenticate your requests:

```javascript
// auth.js

import als from 'als-unhooked';
import db from './lib/db.js';

// auth middleware
const auth = async (req, res, next) => {
  const user = await db.getUserFromReq(req);
	als.set('user', user);
  next();
};
```

Throughout the lifetime of the request, data may be passed to dozens of
functions across several files, creating database records along the way.
You would probably like to keep track of who is creating those records. You
could pass the user object into every single function. Or, with als...

```javascript
// thing.module.js

import als from 'als-unhooked';
import db from './lib/db.js';

async function createThing(_thing) {
  _thing.createdBy = als.get('user').id;
  await db.thing.create(_thing);
}
```

When you set values in AsyncLocalStorage, those values are accessible
until all functions called from the original function – synchronously or
asynchronously – have finished executing. This includes callbacks and
promise handlers.

## Documentation

[API Docs](https://zxanderh.github.io/als-unhooked/)

Guides: Coming Soon

## Copyright & License

See [LICENSE](https://github.com/zxanderh/als-unhooked/blob/main/LICENSE)
for the details of the BSD 2-clause "simplified" license used by `als-unhooked`.

### Thanks to [@jeff-lewis](https://github.com/jeff-lewis) for [cls-hooked](cls), and to the many others who have contributed to async context tracking in node over the years.

[v6]:                https://github.com/sequelize/sequelize/tree/v6
[AsyncLocalStorage]: https://nodejs.org/api/async_context.html#class-asynclocalstorage
[ah]:                https://github.com/nodejs/node/blob/master/doc/api/async_hooks.md
[autotxn]:           https://sequelize.org/docs/v6/other-topics/transactions/#automatically-pass-transactions-to-all-queries
[cls]:               https://github.com/jeff-lewis/cls-hooked
[emitter-listener]:  https://github.com/othiym23/emitter-listener
