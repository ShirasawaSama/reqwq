# reqwq [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Build Status](https://travis-ci.org/ShirasawaSama/reqwq.svg?branch=master)](https://travis-ci.org/ShirasawaSama/reqwq) [![codecov](https://codecov.io/gh/ShirasawaSama/reqwq/branch/master/graph/badge.svg)](https://codecov.io/gh/ShirasawaSama/reqwq) [![GitHub stars](https://img.shields.io/github/stars/ShirasawaSama/reqwq.svg?style=social&label=Stars)](https://github.com/ShirasawaSama/reqwq)

Reactivity state manager of React based on Proxy.

## Install

```bash
npm i reqwq
```

## Features

- **Reactivity**: When you modify them, the view updates.
- **Lightweight**: Only 2KB *(gzip)*.
- **Typescript Support**: Includes TypeScript definitions
- **Hooks Support**

## Usage

### Create a store

CounterStore.ts:

```ts
import { Store } from 'reqwq'

export default class CounterStore extends Store {
  public count = 0
  public add () {
    this.count++
  }
}
```

### Apply to your application

App.tsx:

```tsx
import React from 'react'
import CounterStore from './CounterStore'
import { useStore, newInstance } from 'reqwq'

const Provider = newInstance(CounterStore)

const Counter: React.FC = () => {
  const store = useStore(CounterStore)
  return (
    <>
      <span>Count: {store.count}</span>
      <button onClick={store.add}>Add</button>
    </>
  )
}

const App: React.FC = () => (<Provider><Counter /></Provider>)
export default App
```

### Async support

CounterStore.ts:

```diff
# import { Store } from 'reqwq'

+ const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))
# export default class CounterStore extends Store {
#   public count = 0
+   public loading = false
-   public add () {
+   public async add () {
+     this.loading = true
+     await sleep(5000)
#     this.count++
+     this.loading = false
#   }
# }
```

App.tsx:

```diff
# const Counter: React.FC = () => {
#   const store = useStore(CounterStore)
#   return (
#     <>
#       <span>Count: {store.count}</span>
-       <button onClick={store.add}>Add</button>
+       <button onClick={store.add} disabled={store.loading}>Add</button>
#     </>
#   )
# }
```

### Reference data from another Store

AnotherStore.ts:

```ts
import { Store } from 'reqwq'

export default class AnotherStore extends Store {
  public messages = ['hello']
  public world () { this.messages.push('world!') }
}
```

App.tsx:

```diff
# import React from 'react'
# import CounterStore from './CounterStore'
+ import AnotherStore from './AnotherStore'
# import { useStore } from 'reqwq'

- const Provider = newInstance(CounterStore)
+ const Provider = newInstance(CounterStore, AnotherStore)
+ const anotherStore = Provider.getStore(AnotherStore) // This is OK.

# const Counter: React.FC = () => {
#   const store = useStore(CounterStore)
+   const store2 = useStore(AnotherStore)
+   console.log(store2.messages)
#   return (
#     <>
#       <span>Count: {store.count}</span>
#       <button onClick={store.add}>Add</button>
#     </>
#   )
# }

# const App: React.FC = () => (<Provider><Counter /></Provider>)
# export default App
```

CounterStore.ts:

```diff
# import { Store, injectStore, getStore } from 'reqwq'
# import AnotherStore from './AnotherStore'

# export default class CounterStore extends Store {
+   @injectStore(AnotherStore)
+   private readonly anotherStore: AnotherStore
+
+   private readonly store2 = getStore(AnotherStore) // This is OK.
#   public count = 0
#   public add () {
#     this.count++
+     this.anotherStore.world()
+     this.store2.messages.forEach(alert)
+     // this.getStore(AnotherStore).messages // This is OK.
#   }
# }
```

### Add stores dynamically

```ts
import { newInstance } from 'reqwq'
import CounterStore from './CounterStore'

const Provider = newInstance(CounterStore)

const fn = async () => {
  const AnotherStore = await import('./AnotherStore')
  Provider.addStores(AnotherStore)
}
fn()
```

### Class Component

```tsx
import React, { Component } from 'react'
import { withStores } from 'reqwq'
import CounterStore from './CounterStore'
import AnotherStore from './AnotherStore'

@withStores({ store1: CounterStore, store2: AnotherStore })
export class C extends Component {
  public render () {
    const { store1, store2 } = this.props
    return <>Count: {store1.count}</>
  }
}

@withStores({ counter: CounterStore }, (m, props) => ({ stores: m }))
export class D extends Component {
  public render () {
    const { stores } = this.props
    return <>Count: {stores.counter.count}</>
  }
}
```

### Class Component with reactivity store

```tsx
import React from 'react'
import { ComponentWithStore, PureComponentWithStore } from 'reqwq'

export default class C extends ComponentWithStore {
  private i = 0
  public render () {
    return <>
      <p>{this.i}</p>
      <button onClick={() => this.i++}>Add</button>
  }
}
```

### Hooks with reactivity store

```tsx
import React from 'react'
import { useOutsideStore } from 'reqwq'

class Store {
  public data = []
  public push () { this.data.push(Math.random()) }
}
const F: React.FC = () => {
  const store = useOutsideStore(() => new Store())
  return <>
    Array: {store.data.join(',')}
    <button onClick={store.push}>Push</button>
  </>
}
export default F
```

### Manually patch data

By default, the data will be updated at the end of the event loop. If you want to update in advance, you need to do the following:

```ts
// Global store:
const G = newInstance(Store)
G.patch()

// Component with reactivity store:
class C extends ComponentWithStore {
  private i = 0
  public fn () { this.patch() }
}

// Hooks with reactivity store:
const store = useOutsideStore(() => new Store())
store.patch()
```

## IE 9 or Safari 6

```bash
npm i proxy-polyfill
```

```ts
import 'proxy-polyfill'
import { newInstance } from 'reqwq'
```

## Author

Shirasawa

## License

[MIT](./LICENSE)
