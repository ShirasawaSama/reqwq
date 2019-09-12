# use-model [![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Build Status](https://travis-ci.org/ShirasawaSama/use-model.svg?branch=master)](https://travis-ci.org/ShirasawaSama/use-model) [![codecov](https://codecov.io/gh/ShirasawaSama/use-model/branch/master/graph/badge.svg)](https://codecov.io/gh/ShirasawaSama/use-model) [![GitHub stars](https://img.shields.io/github/stars/ShirasawaSama/use-model.svg?style=social&label=Stars)](https://github.com/ShirasawaSama/use-model)

Lightweight global state manager of React hooks based on [Immer](https://github.com/immerjs/immer).

## Install

```bash
Currently not pushed to npmjs.
```

## Usage

### Defined a model

CounterModel.ts:

```ts
import { Model } from 'use-model'

export default class CounterModel extends Model {
  public count = 0
  public add () {
    this.count++
  }
}
```

### Apply to your application

App.tsx:

```ts
import React from 'react'
import CounterModel from './CounterModel'
import { useModel } from 'use-model'

const Provider = getProvider(CounterModel)

const Counter: React.FC = () => {
  const model = useModel(CounterModel)
  return (
    <>
      <span>Count: {model.count}</span>
      <button onClick={model.add}>Add</button>
    </>
  )
}

const App: React.FC = () => (<Provider><Counter /></Provider>)
export default App
```

### Async support

CounterModel.ts:

```diff
import { Model } from 'use-model'

+ const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))
export default class CounterModel extends Model {
  public count = 0
+ public loading = false
! public * add () {
+   this.loading = true
+   yield sleep(5000)
#   // const value = yield axios('something.com')
#   // const value = yield* anotherGeneratorFunction()
#   // const values = [promise1, promise2, promise3, ...]
    this.count++
+   this.loading = false
  }
}
```

App.tsx:

```diff
const Counter: React.FC = () => {
  const model = useModel(CounterModel)
  return (
    <>
      <span>Count: {model.count}</span>
!     <button onClick={model.add} disabled={model.loading}>Add</button>
    </>
  )
}
```

### Reference data from another Model

AnotherModel.ts:

```ts
import { Model } from 'use-model'

export default class AnotherModel extends Model {
  public messages = ['hello']
  public world () { this.messages.push('world!') }
}
```

App.tsx:

```diff
import React from 'react'
import CounterModel from './CounterModel'
+ import AnotherModel from './AnotherModel'
import { useModel } from 'use-model'

! const Provider = getProvider(CounterModel, AnotherModel)

const Counter: React.FC = () => {
  const model = useModel(CounterModel)
+ const model2 = useModel(AnotherModel)
+ console.log(model2.messages)
  return (
    <>
      <span>Count: {model.count}</span>
      <button onClick={model.add}>Add</button>
    </>
  )
}

const App: React.FC = () => (<Provider><Counter /></Provider>)
export default App
```

CounterModel.ts:

```diff
import { Model } from 'use-model'
import AnotherModel from './AnotherModel'

export default class CounterModel extends Model {
  public count = 0
  public add () {
    this.count++
+   const m = this.getModel(AnotherModel)
+   m.world()
+   m.messages.forEach(alert)
  }
}
```

## Author

Shirasawa

## License

[MIT](./LICENSE)
