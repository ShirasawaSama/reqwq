# reqwq [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) ![npm](https://img.shields.io/npm/v/reqwq) [test](https://github.com/ShirasawaSama/reqwq/workflows/Test/badge.svg) [![codecov](https://codecov.io/gh/ShirasawaSama/reqwq/branch/master/graph/badge.svg)](https://codecov.io/gh/ShirasawaSama/reqwq) [![GitHub stars](https://img.shields.io/github/stars/ShirasawaSama/reqwq.svg?style=social&label=Stars)](https://github.com/ShirasawaSama/reqwq)

A reactivity state manager of React.js

[简体中文](./README.zh.md) [English](./README.md)

## Install

```bash
npm install reqwq
```

## Features

- **Reactivity**: When you modify them, the view updates.
- **Lightweight**: Only 2KB *(gzip)*.
- **TypeScript Support**: Includes TypeScript definitions.
- **Proxy**: Build on ES6 Proxy.
- **Immutable**: Data update does not modify the previous object.
- **Hooks Support**: React hooks syntax supporting.

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
    </>
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

## Babel plugin: react-model (rModel)

With this babel plugin, you can easily use [two-way data binding](https://vuejs.org/v2/guide/forms.html) likes [Vue.js](https://vuejs.org)

### .babelrc

```json
{
  "plugin": ["reqwq/babel-plugin.js"]
}
```

### Config

```json
{
  "plugin": [["reqwq/babel-plugin.js"], { "prefix": "r", "notTransformObject": false }]
}
```

### Usage

```tsx
<input rModel={this.text} />
<input rModel={this.count} type="number" /> // this.count must be a number
<input rModel={this.checked} type="radio" /> // property name is 'checked'
<input rModel={this.checked} type="checkbox" /> // property name is 'checked'
<MyInput rModel={this.custom} rPropName="customProp" />
<MyCheckBox rModel={this.checked} rPropName="checked" />
```

Equivalent to:

```tsx
<input value={this.text} onChange={a => {
  a = a.target.value
  this.text = typeof this.value === 'number' ? +a : a
}} />
```

## IE 9 and Safari 6

Firstly, install module:

```bash
npm i proxy-polyfill
```

Then import them:

```ts
import 'proxy-polyfill'
import { newInstance } from 'reqwq'
```

## Author

Shirasawa

## License

[MIT](./LICENSE)
