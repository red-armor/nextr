# co

_A tiny middleware combiner has `back`, `next`, `abort` and `resume` actions_

## Motivation

A action could split into minor action, and every minor action has a connection. such as trigger next one if success, retry from last step, or restart from beginning..

For this purpose, every minor task should comply with a semantically pattern. In `co`, the last two params will be `ctx` and `actions`

## Install

```bash
npm i nextr
```

## Simple example

```js
import { Co } from 'nextr'

const payment = new Co()

const validateIdentity = (user, ctx, actions) => {
  const falsy = validate(use.identity)
  if (falsy) actions.next()
  else actions.resume()
}

const validateAccount = (user, ctx, actions) => {
  const falsy = isAfford(use.account)
  if (falsy) actions.next()
  else action.resume()
}

payment.use(validateIdentity)
payment.use(validateAccount)

const user = {
  identify: { name: 'charlie' },
  account: 100,
}
payment.start(user)
```

## Usage

### Co({ ctx: object, onError?: Function, onSuccess?: Function, onFinish?: Function })

| Property | Description | Type | Required|
| -------- | ----------- | ---- | --- |
| ctx  | Initial value of `ctx` and default as `{}`. It will be shared between middleware | object | no|
| onError  | Triggered when `abort` function is invoked | Function | no|
| onSuccess  | Triggered when there is no `nextSibling` of current running middleware | Function | no|
| onFinish  | Trigger when `onError` or `onSuccess` is invoked | Function | no|

#### Provide initial ctx value

```js
const payment = new Co({ ctx: { paymentMethod: 'visa' }})
```

#### use(...args: Co | <...T>(...args: [...T, ctx, actions])[] => void)

`use` is to register `fn` to `co` instance. `fn` is an variadic function with `ctx` and `actions` tailing params.

```js
const payment = new Co({ ctx: { paymentMethod: 'visa' }})

const validateAddress = (args, ctx, actions) => {
  const { location, name } = args
  if (!isValidAddress({ location, name })) {
    return actions.abort()
  }

  actions.next()
}

const validateCard = (args, ctx, actions) => {
  const { cardNumber } = args
  if (!isValidCard({ cardNumber })) {
    return actions.abort()
  }

  actions.next()
}

const applyPayment = payment.use(
  validateAddress,
  validateCard,
)
```

`arg` could be a Co object. In this condition, Co will copy middleware from arg object.

```js
const job = new Co()
job.use(fn)

const nextJob = new Co()
nextJob.use(job)

job.start()
nextJob.start()
```

#### start(...args: array[])

`start` will make actions begin running. It `args` will be passing between middleware as heading params.

```js
const job = new Co()
job.use(fn)

job.start()
```

### actions

| Property | Description |
| -------- | ----------- |
| next  |  Trigger next middleware |
| back  |  Rerun from last middleware |
| abort  |  Stop middleware running |
| resume  |  Rerun from beginning |

## Error

### Default Error handler

- [koa - Error Handling](https://github.com/koajs/koa/blob/master/docs/error-handling.md#default-error-handler)

> The default error handler is essentially a try-catch at the very beginning of the middleware chain.

```js
const job = new Co()
job.use((actions) => {
  try {
    actions.next()
  } catch (err) {
    // do default action
  }
})
```

When an error occur, error message will be marked with a common info to indicate it's a Co Error. The rules to build info is described as follows

```js
  const message = error.message;
  const functionName = fn.name || String(fn).slice(0, 10);
  const coErrorMessage = `[Co Exception ${functionName}]: ${message}`;
```