import test from 'ava'
import * as U from './index'
import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import * as jsdom from 'jsdom'
import { mount, configure } from 'enzyme'

const { window } = new jsdom.JSDOM('<body></body>')
Object.assign(global, {
  window,
  document: window.document,
  navigator: window.navigator
})
configure({ adapter: new (Adapter as any)() })

const { getProvider, Model, useModel } = U

test('basic', async t => {
  class M extends Model {
    public i = 0
    public add () { this.i++ }
    public * asyncAdd () {
      this.i++
      this.i += yield Promise.resolve(10)
    }

    public willThrow () { throw new Error() }
    public * asyncWillThrow () {
      yield 1
      yield Promise.reject(new Error())
    }
    public * asyncWillThrow2 () {
      yield 1
      throw new Error()
    }

    public * asyncArray () {
      if (this.g() !== 233) throw new Error()
      return yield [Promise.resolve(1), Promise.resolve(2)]
    }
    private g () { return 233 }
  }
  const Provider = getProvider(M)
  const A: React.FC = () => {
    const m = useModel(M)
    return <>Value:{m.i}</>
  }
  const app = mount(<Provider><A /></Provider>)
  const get = Provider.getModel(M)
  t.true(app.html().includes('Value:0'), 'init')
  t.notThrows(() => get().add(), 'call')
  t.is(get().i, 1, 'model changed')
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')
  await t.notThrowsAsync(() => get().asyncAdd(), 'async call')
  app.update()
  t.true(app.html().includes('Value:12'), 're-rendered')
  t.throws(() => get().willThrow(), null, 'throw')
  await t.throwsAsync(() => get().asyncWillThrow(), null, 'async throw')
  t.deepEqual(await get().asyncArray(), [1, 2])
  await t.throwsAsync(() => get().asyncWillThrow2(), null, 'async throw2')

  class UnRegistered extends Model { public i = 'ahh' }
  const B: React.FC = () => {
    const m = useModel(UnRegistered)
    return <>Value:{m.i}</>
  }
  t.throws(() => mount(<Provider><B /></Provider>), null, 'unregistered')
  t.throws(() => Provider.getModel(UnRegistered)(), null, 'unregistered2')
  t.throws(() => getProvider(M, M), null, 'repeat register')

  class M2 extends Model { constructor (public i: string = 'bug') { super() } }
  const P = getProvider(new M2('hello'))
  const C: React.FC = () => {
    const m = useModel(M2)
    return <>{m.i}</>
  }
  t.true(mount(<P><C /></P>).html().includes('hello'), 'new model')
})
