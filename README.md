# Asynchronous Local Storage ( UN-Hooked )

**This is a fork of [cls-hooked][cls] using [AsyncLocalStorage] instead of [async_hooks][ah].**

Asynchronous context tracking has come a long way in the last decade. [AsyncLocalStorage], the official stable implementation of async_hooks, provides many optimizations we can benefit from. And with the introduction of AsyncContextFrame in v22, async_hooks can be left behind completely. Therefore, this package provides a drop-in replacement for [cls-hooked][cls] based on AsyncLocalStorage, so it can continue to benefit from ongoing development by the Node.js team.

## Usage

One common use case is tracking a user for the duration of an http request. Suppose you use a middleware to authenticate your users:

```javascript
// app.js
import express from 'express'
import als from 'als-unhooked/legacy';

const app = express();
const namespace = als.createNamespace('user_session');

// enter the namespace context
app.use((req, res, next) => {
  namespace.run(() => {
    next();
  });
});

// auth middleware
app.use(async (req, res, next) => {
  const user = await db.getUserFromReq(req);
  namespace.set('user', user);
  next();
});
```

Later on in the lifetime of the request, you need to record which user created some database record:

```javascript
// thing.module.js

import als from 'als-unhooked';
import db from './lib/db.js';

async function createThing(_thing) {
  _thing.createdBy = als.get('user').id;
  await db.thing.create(_thing);
}
```

### Use with Sequelize v6

A major motivator in creating this package was for use with [sequelize v6][v6],
which uses [cls-hooked][cls] for [automatic transaction passing][autotxn].
This package is not officially supported by sequelize at this time, but the Modern API
has been designed to be compatible with sequelize's implementation of cls-hooked.

```javascript
// app.js

import { Sequelize } from 'sequelize';
import ALS from 'als-unhooked';

Sequelize.useCLS(new ALS());
```

The Legacy API is, of course, also compatible with sequelize. But the modern API is
recommended as it is more performant.

## Modern vs Legacy

> **TL;DR** If you're using [sequelize v6][v6] or just want a nice AsyncLocalStorage implementation,
> use the modern API. If you need a drop-in replacement for cls-hooked for use with something
> other than sequelize, you probably want the Legacy API.

The package has 2 different APIs: modern and legacy. The legacy API is a total drop-in replacement
for [cls-hooked][cls]. In accomplishing this, it creates overhead that, while minimal, can be avoided
for many applications. It also inherits some mostly-outdated design patterns, such as process-level
global variables. To eliminate these, a minimal wrapper of AsyncLocalStorage was created to be:

1. Easy to use
2. Compatible with sequelize

## Performance

JS benchmarks should always be taken with a grain of salt. That said, the following results should hopefully show that both the the Modern API and Legacy API of als-unhooked are more performant than [cls-hooked][cls]. Further, the Modern API is generally more performant than the Legacy API.

![benchmark](./typedoc/benchmarks.png)

> Note: Only the average run times are shown. See [benchmark/_exec.js](./benchmark/_exec.js) for more details on how the benchmarks are run.

> Note 2: The Modern API was retrofitted with some functionality from the legacy interface for the purpose of these tests.

## Working with EventEmitters

Listeners triggered by event-driven classes like EventEmitter will sometimes be called in a different execution context, resulting in so-called "context loss." To mitigate this, [cls-hooked][cls] provides the Namespace#bindEmitter method, which uses [emitter-listener] to monkeypatch the EventEmitter, automatically binding every listener to the current Namespace context. This method is convenient, and may even be necessary in some cases. In most cases, however, avoiding context loss is as simple is binding the listener before adding it to the emitter:

```javascript
namespace.run(() => {
  eventEmitter.on('my_event', namespace.bind(() => {
    namespace.get('color'); // === 'red'
  }));
  eventEmitter.on('my_event', () => {
    namespace.get('color'); // === 'blue'
  });

  namespace.set('color', 'red');

  // enter new context
  namespace.run(() => {
    namespace.set('color', 'blue');
    eventEmitter.emit('bound');
  });
});
```

[v6]: https://github.com/sequelize/sequelize/tree/v6
[AsyncLocalStorage]: https://nodejs.org/api/async_context.html#class-asynclocalstorage
[ah]: https://github.com/nodejs/node/blob/master/doc/api/async_hooks.md
[autotxn]: https://sequelize.org/docs/v6/other-topics/transactions/#automatically-pass-transactions-to-all-queries
[cls]: https://github.com/jeff-lewis/cls-hooked
[emitter-listener]: https://github.com/othiym23/emitter-listener
