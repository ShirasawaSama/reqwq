import React from 'react'
import ReactDOM from 'react-dom'
import { getProvider, Model, useModel } from './index'

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time))

class CounterModel extends Model {
  public i = 0
  public loading = false
  public * add () {
    this.i++
    this.loading = true
    yield sleep(2000)
    this.i++
    yield sleep(3000)
    this.i++
    this.loading = false
  }
}

const Provider = getProvider(CounterModel)

const Counter: React.FC = () => {
  const model = useModel(CounterModel)
  return (
    <>
      <span>Count: {model.i}</span>
      <button onClick={model.add} disabled={model.loading}>Add</button>
    </>
  )
}

const App: React.FC = () => (<Provider><Counter /></Provider>)

ReactDOM.render(<App />, document.getElementById('root'))
