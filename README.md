
# Asynchronous Local Storage ( UN-Hooked )

### This is a fork of [cls-hooked](https://github.com/jeff-lewis/cls-hooked) using [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) instead of [async_hooks](https://github.com/nodejs/node/blob/master/doc/api/async_hooks.md).

Since the Node team now discourages the use of [async_hooks](https://github.com/nodejs/node/blob/master/doc/api/async_hooks.md),
this package aims to provide a drop-in replacement for cls-hooked using async_hooks successor,
the [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) API
(which is officially stable, by the way).

### Use with Sequelize (v6)
A major motivator in creating this package was for use with [sequelize v6](https://github.com/sequelize/sequelize/tree/v6),
which uses cls-hooked for [automatic transaction passing](https://sequelize.org/docs/v6/other-topics/transactions/#automatically-pass-transactions-to-all-queries).
This package is not officially supported by sequelize at this time, but the modern API
has been designed to be compatible with sequelize's implementation of cls-hooked.

```javascript
// app.js

import { Sequelize } from 'sequelize';
import { ALS } from 'als-unhooked';

Sequelize.useCLS(new ALS());
```

### Thanks to [@jeff-lewis](https://github.com/jeff-lewis) for [cls-hooked](https://github.com/jeff-lewis/cls-hooked), and to the many others who have contributed to async context tracking in node over the years.

---
Continuation-local storage works like thread-local storage in threaded
programming, but is based on chains of Node-style callbacks instead of threads.
The standard Node convention of functions calling functions is very similar to
something called ["continuation-passing style"][cps] in functional programming,
and the name comes from the way this module allows you to set and get values
that are scoped to the lifetime of these chains of function calls.

Suppose you're writing a module that fetches a user and adds it to a session
before calling a function passed in by a user to continue execution:

```javascript
// setup.js

import als from 'als-unhooked';
import db from './lib/db.js';

function start(options, next) {
  db.fetchUserById(options.id, function (error, user) {
    if (error) return next(error);

    als.set('user', user);

    next();
  });
}
```

Later on in the process of turning that user's data into an HTML page, you call
another function (maybe defined in another module entirely) that wants to fetch
the value you set earlier:

```javascript
// send_response.js

import als from 'als-unhooked';
import render from './lib/render.js';

function finish(response) {
  const user = als.get('user');
  render({user: user}).pipe(response);
}
```

When you set values in AsyncLocalStorage, those values are accessible
until all functions called from the original function – synchronously or
asynchronously – have finished executing. This includes callbacks passed to
`process.nextTick` and the [timer functions][] ([setImmediate][],
[setTimeout][], and [setInterval][]), as well as callbacks passed to
asynchronous functions that call native functions (such as those exported from
the `fs`, `dns`, `zlib` and `crypto` modules).

A simple rule of thumb is anywhere where you might have set a property on the
`request` or `response` objects in an HTTP handler, you can (and should) now
use AsyncLocalStorage. This API is designed to allow you extend the
scope of a variable across a sequence of function calls, but with values
specific to each sequence of calls.

While cls-hooked used namespaces, als-unhooked relies on instances of the ALS
class. Most will not have need for multiple instances, though, so a default
instance is bound to the ALS class itself as static methods for convenience.

One difference in the main implementation is that, unlike cls-hooked, nested
calls to als.run() do not automatically inherit their parent context. You can
easily remedy this by passing als.getStore() as the second argument to als.run().

## ToDo
 - Finish legacy (total drop-in) implementation
 - Finish legacy tests
 - Pass tap tests

# copyright & license

See [LICENSE](https://github.com/zxanderh/als-unhooked/blob/main/LICENSE)
for the details of the BSD 2-clause "simplified" license used by `als-unhooked`.

[timer functions]: https://nodejs.org/api/timers.html
[setImmediate]:    https://nodejs.org/api/timers.html#timers_setimmediate_callback_arg
[setTimeout]:      https://nodejs.org/api/timers.html#timers_settimeout_callback_delay_arg
[setInterval]:     https://nodejs.org/api/timers.html#timers_setinterval_callback_delay_arg
[cps]:             http://en.wikipedia.org/wiki/Continuation-passing_style
