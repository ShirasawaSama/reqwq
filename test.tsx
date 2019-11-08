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

const { newInstance, Store, useStore } = U

test('basic', async t => {
  class M extends Store {
    public i = 0
    public arr = [1]
    public add () { this.i++ }
  }
  let Provider = newInstance(M)
  const A: React.FC = () => {
    const m = useStore(M)
    return <>Value:{m.i} Array:{m.arr.join(',')}</>
  }
  let app = mount(<Provider><A /></Provider>)
  let store = Provider.getStore(M)
  t.true(app.html().includes('Value:0'), 'init')
  t.notThrows(() => store.add(), 'call')
  store.i = 1
  t.is(store.i, 1, 'store changed')
  Provider.patch()
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')
  store.arr.push(5)
  Provider.patch()
  app.update()
  t.true(app.html().includes('Array:1,5'), 'array')

  class UnRegistered extends Store { public i = 'ahh' }
  const B: React.FC = () => {
    const m = useStore(UnRegistered)
    return <>Value:{m.i}</>
  }
  t.throws(() => mount(<Provider><B /></Provider>), null, 'unregistered')
  t.throws(() => Provider.getStore(UnRegistered), null, 'unregistered2')
  t.throws(() => newInstance(M, M), null, 'repeat register')

  class M2 extends Store {
    @U.injectStore(M)
    public store: M
    constructor (public i: string = 'bug') { super() }
    public fn () { return this.getStore(UnRegistered).i }
  }
  const P = newInstance(M, new M2('hello'))
  const C: React.FC = () => {
    const m = useStore(M2)
    return <>{m.i}</>
  }
  t.is(P.getStore(M2).store.i, 0, 'decorate')
  t.true(mount(<P><C /></P>).html().includes('hello'), 'new store')

  P.addStores(UnRegistered)
  t.true(P.getStore(UnRegistered).i === 'ahh', 'addModels')
  t.true(P.getStore(M2).fn() === 'ahh', 'getModel')

  @U.withStores({ m: M }, m => m)
  class RC extends React.Component<{ m?: M }> {
    public render () {
      return <>Value:{this.props.m.i}</>
    }
  }
  Provider = newInstance(M)
  app = mount(<Provider><RC /></Provider>)
  store = Provider.getStore(M)
  t.true(app.html().includes('Value:0'), 'init')
  t.notThrows(() => store.add(), 'call')
  t.is(store.i, 1, 'store changed')
  Provider.patch()
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')

  class M3 extends Store {
    public x = null
    private g = U.getStore(M)
    constructor (type?: boolean) {
      super()
      if (type) this.x = this.g.i; else this.g.i = 1
    }
  }
  t.throws(() => new M3(), null, 'not initiated')
  t.throws(() => new M3(true), null, 'not initiated')

  t.notThrows(() => {
    let g = false
    const d = U.createProxy({ a: 0 }, () => (g = true))
    d.b = 2
    t.true(g, 'onchange')
    t.is(d.b, 2, 'changed')
  })

  t.truthy(store.toJSON, 'toJSON')
})
