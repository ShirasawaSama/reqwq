import React from 'react'
import ReactDOM from 'react-dom'
import { newInstance, Store, useStore } from './index'

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))

class CounterModel extends Store {
  public i = 0
  public loading = false
  public arr = []
  public async add () {
    // this.i++
    this.arr.push('a')
    // this.loading = true
    await sleep(2000)
    this.arr.push('b')
    // this.i++
    await sleep(3000)
    // this.i++
    this.arr.push('c')
    // this.loading = false
  }
}

const Provider = newInstance(CounterModel)

const Counter: React.FC = () => {
  const model = useStore(CounterModel)
  console.log(model)
  return (
    <>
      <div>Count: {model.i}, Array: {model.arr.join(' ')}</div>
      <button onClick={model.add} disabled={model.loading}>Add</button>
    </>
  )
}

const App: React.FC = () => (<Provider><Counter /></Provider>)

ReactDOM.render(<App />, document.getElementById('root'))
