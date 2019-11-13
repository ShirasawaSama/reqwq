# reqwq [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) ![npm](https://img.shields.io/npm/v/reqwq) [![Build Status](https://travis-ci.org/ShirasawaSama/reqwq.svg?branch=master)](https://travis-ci.org/ShirasawaSama/reqwq) [![codecov](https://codecov.io/gh/ShirasawaSama/reqwq/branch/master/graph/badge.svg)](https://codecov.io/gh/ShirasawaSama/reqwq) [![GitHub stars](https://img.shields.io/github/stars/ShirasawaSama/reqwq.svg?style=social&label=Stars)](https://github.com/ShirasawaSama/reqwq)

一个响应式的 React.js 状态管理模块.

[简体中文](./README.zh.md) [English](./README.md)

## 安装

```bash
npm install reqwq
```

## 特性

- **响应式**: 当你修改了数据, 网页内容也会随之更新.
- **轻量**: *Gzip* 后只有不到 2KB.
- **TypeScript 支持**: 使用 TypeScript 编写.
- **Proxy**: 基于 ES6 的 Proxy 对数据更新进行拦截.
- **数据不可变**: 数据更新不会改变先前的对象结构.
- **Hooks 支持**: 支持 React 的 Hooks.

## 使用方法

### 创建一个状态库

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

### 在你的组建中引用状态库

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

### 异步函数支持

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

### 从别的状态库中获取数据

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
+ const anotherStore = Provider.getStore(AnotherStore) // 这也是一种方法

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
+   private readonly store2 = getStore(AnotherStore) // 这也是一种方法
#   public count = 0
#   public add () {
#     this.count++
+     this.anotherStore.world()
+     this.store2.messages.forEach(alert)
+     // this.getStore(AnotherStore).messages // 这样也行, 是动态获取的
#   }
# }
```

### 动态添加新的状态库

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

### 在 `Class组件` 中引入状态库

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

### 包含响应式数据的 `Class组件`

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

### 包含响应式数据的 `Hooks组件`

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

### 手动触发数据更新

数据库默认会在当前事件循环末尾进行数据更新, 如果你想提前更新则需要以下操作:

```ts
// 全局数据库:
const G = newInstance(Store)
G.patch()

// 包含响应式数据的 Class组件:
class C extends ComponentWithStore {
  private i = 0
  public fn () { this.patch() }
}

// 包含响应式数据的 Hooks组件:
const store = useOutsideStore(() => new Store())
store.patch()
```

## Babel 插件: react-model (rModel)

有了这个插件你可以轻松使用类似于 [Vue.js](https://vuejs.org) 中的 [双向绑定](https://vuejs.org/v2/guide/forms.html) 语法糖.

### .babelrc

```json
{
  "plugin": ["reqwq/babel-plugin.js"]
}
```

### 配置

```json
{
  "plugin": [["reqwq/babel-plugin.js"], { "prefix": "r", "notTransformObject": false }]
}
```

### 使用

```tsx
<input rModel={this.text} />
<input rModel={this.count} type="number" /> // this.count 必须为一个数字
<input rModel={this.checked} type="radio" /> // 此时自动从 'checked' 字段取值
<input rModel={this.checked} type="checkbox" /> // 此时自动从 'checked' 字段取值
<MyInput rModel={this.custom} rPropName="customProp" />
<MyCheckBox rModel={this.checked} rPropName="checked" />
```

等价于:

```tsx
<input value={this.text} onChange={a => {
  a = a.target.value
  this.text = typeof this.value === 'number' ? +a : a
}} />
```

## IE 9 与 Safari 6 支持

首先安装模块:

```bash
npm i proxy-polyfill
```

然后引入模块:

```ts
import 'proxy-polyfill'
import { newInstance } from 'reqwq'
```

## 作者

Shirasawa

## 协议

[MIT](./LICENSE)
