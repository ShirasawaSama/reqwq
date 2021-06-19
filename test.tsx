/* eslint-disable no-use-before-define */
import test from 'ava'
import * as U from './index'
import React from 'react'
import Adapter from '@wojtekmaj/enzyme-adapter-react-17'
import * as jsdom from 'jsdom'
import { types } from 'util'
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
  store.i = 2
  store.arr.push(5)
  Provider.patch()
  app.update()
  t.true(app.html().includes('Array:1,5'), 'array')
  t.true(app.html().includes('Value:2'), 'multiple update')

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
  delete store.i
  t.is(store.i, undefined, 'delete')

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
    d.a = 2
    t.true(g, 'onchange')
    t.is(d.a, 2, 'changed')
  })

  t.truthy(store.toJSON, 'toJSON')
})

test('outside', t => {
  class M {
    public i = 0
    public deep = { g: [1] }
    public add () { this.i++ }
  }
  let store: any
  const F = () => {
    store = U.useOutsideStore(() => new M())
    return <>Value:{store.i} Array:{store.deep.g.join(',')}</>
  }
  let app = mount(<F />)
  t.true(app.html().includes('Value:0'), 'init')
  store.add()
  store.patch()
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')
  store.deep.g.push(7)
  store.patch()
  app.update()
  t.true(app.html().includes('Array:1,7'), 'deep re-rendered')

  class F1 extends U.ComponentWithStore {
    public i = 0
    public render () {
      store = this
      return <>Value:{this.i}</>
    }
  }
  app = mount(<F1 />)
  t.true(app.html().includes('Value:0'), 'init')
  store.i++
  store.patch()
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')

  class F2 extends U.PureComponentWithStore {
    public deep = { i: 0 }
    public t = { [U.NOT_PROXY]: true, g: 0 }
    public render () {
      store = this
      return <>Value:{this.deep.i}</>
    }
  }
  app = mount(<F2 />)
  t.true(app.html().includes('Value:0'), 'init')
  store.deep.i++
  store.patch()
  app.update()
  t.true(app.html().includes('Value:1'), 're-rendered')
  t.false(types.isProxy(store.t), 'not proxy')
})
