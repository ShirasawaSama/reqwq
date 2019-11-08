import React, { createContext, useState, useContext, Context, createElement as c, Component, PureComponent } from 'react'

export type GetStore = <M extends typeof Store> (store: M) => InstanceType<M>
export class Store {
  public toJSON: () => this
  public getStore: GetStore = () => { throw new Error('Initialization is not complete yet.') }
}

const STORE = Symbol('Store')
const PROXY = Symbol('Proxy')
const PARENT = Symbol('Parent')
const ROOT = Symbol('Root')
const KEY = Symbol('Key')
const BASE = Symbol('Base')
const ON_CHANGE = Symbol('onChange')

interface Ctx { ids: Map<typeof Store, number>, contexts: Array<Context<null>>, stores: Store[] }
const G = createContext(null as Ctx)

let _getStore
const TEXT = 'Initialization is not complete yet.'
export const getStore = <T extends typeof Store> (store: T) => (_getStore && _getStore(store)) || new Proxy({}, {
  get (_, key) { /* istanbul ignore next */ if (key === STORE) return store; else throw new Error(TEXT) },
  set () { throw new Error(TEXT) }
}) as InstanceType<T>
export const injectStore = <T extends typeof Store> (store: T) => (t: any, key: string) => (t[key] = getStore(store))
export const withStores = <T extends { [key: string]: typeof Store }> (stores: T,
  mapping?: (t: { [key in keyof T]: InstanceType<T[key]> }) => any) =>
  (C: typeof Component) => {
    const F: React.FC = props => {
      const ctx = useContext(G)
      const obj: any = { }
      for (const i in stores) {
        const id = ctx.ids.get(stores[i])
        useContext(ctx.contexts[id])
        obj[i] = ctx.stores[id]
      }
      /* istanbul ignore next */
      return c(C, Object.assign((mapping && mapping(obj)) || obj), props)
    }
    return class extends PureComponent {
      public render () {
        return c(F, this.props as any)
      }
    }
  }
export const useStore = <T extends typeof Store> (store: T) => {
  const m = useContext(G)
  const id = m.ids.get(store)
  const ctx = m.contexts[id]
  if (!ctx) throw new Error('No such store: ' + /* istanbul ignore next */ (store && ((store as any).name || store)))
  useContext(ctx)
  return m.stores[id] as InstanceType<T>
}
function V (v: any) { this.value = v }

const handlers: ProxyHandler<any> = {
  get (target, p, r) {
    if (p === PROXY) return target[PROXY]
    if (typeof target[PROXY][p] !== 'undefined') return target[PROXY][p]
    const v = Reflect.get(target, p, r)
    if (p === 'toJSON') return v || (() => target)
    switch (typeof v) {
      case 'object': return (target[PROXY][p] = createProxy(v, target[ON_CHANGE], target[ROOT], target, p))
      case 'function': return target[BASE] ? (target[PROXY][p] = v.bind(target[BASE])) : v
      default: return v
    }
  },
  set (target, p, v, r) {
    if (Object.is(Reflect.get(target, p, r), v)) return true
    const re = Reflect.set(target, p, v, r)
    /* istanbul ignore next */ if (re) target[ON_CHANGE](target)
    return re
  }
}
export const createProxy = (s: any, onChange: (target: any) => void, id?: number, parent?: any, key?: any) => {
  s[PROXY] = new Object()
  s[PARENT] = parent
  s[KEY] = key
  s[ON_CHANGE] = onChange
  if (id != null) s[ROOT] = id
  const re = new Proxy(s, handlers)
  if (!key) s[BASE] = re
  return re
}

export const newInstance: (...stores: Array<Store | typeof Store>) => React.FC & { getStore: GetStore,
  patch: () => void, addStores: (...stores: Array<Store | typeof Store>) => void } = function () {
    let update: (data: boolean) => void = null
    let flag = false
    const ids = new WeakMap<typeof Store, number>()
    const stores: Store[] = []
    const contexts: Array<React.Context<null>> = []
    const value = new V({ ids, contexts, stores })
    const flags: boolean[] = []
    let modified = false
    let modifiedList = { }
    const updates = new Set()
    const patch = () => {
      if (!modified || updates.size === 0) return
      updates.forEach(u => {
        const parent = u[PARENT]
        if (!parent) return
        const k = u[KEY]
        const curV = parent[k]
        parent[PROXY][k] = undefined
        parent[k] = Array.isArray(curV) ? curV.slice() : Object.assign(new Object(), curV)
      })
      for (const id in modifiedList) flags[id] = !flags[id]
      modifiedList = {}
      updates.clear()
      modified = false
      if (update) update(!flag)
    }
    const change = (target: any) => {
      updates.add(target)
      if (typeof modifiedList[target[ROOT]] === 'undefined') modifiedList[target[ROOT]] = null
      if (!modified) {
        modified = true
        new Promise(resolve => resolve()).then(patch)
      }
    }
    _getStore = (store: any) => stores[ids.get(store)]
    const gs = <M extends typeof Store> (store: M) => {
      const v = stores[ids.get(store)]
      if (!v) throw new Error('No such store: ' + /* istanbul ignore next */ (store && ((store as any).name || store)))
      return v as InstanceType<M>
    }
    function addStore () {
      let j = arguments.length
      while (j--) {
        const it = arguments[j]
        const store = it instanceof Store ? it : new it()
        const proto = Object.getPrototypeOf(store)
        const storeClass = proto.constructor as typeof Store
        if (ids.has(storeClass)) {
          /* istanbul ignore next */
          throw new Error('The store already exists: ' + ((storeClass as any).name || storeClass))
        }
        /* istanbul ignore next */
        Reflect.ownKeys(store).forEach(k => store[k] && store[k][STORE] && (store[k] = gs(store[k][STORE])))
        /* istanbul ignore next */
        Reflect.ownKeys(proto).forEach(k => proto[k] && proto[k][STORE] && (store[k] = gs(proto[k][STORE])))
        store.getStore = gs
        ids.set(storeClass, stores.push(createProxy(store, change, stores.length)) - 1)
        contexts.push(createContext(null))
        flags.push(false)
      }
      if (update) update(!flag)
    }
    addStore.apply(null, arguments)
    const ret: any = (props: React.PropsWithChildren<{}>) => {
      const v = useState(false)
      flag = v[0]
      update = v[1]
      return c(G.Provider, value, contexts.reduceRight((p, t, i) => c(t.Provider, new V(flags[i]), p), props.children))
    }
    ret.getStore = gs
    ret.addStores = addStore
    ret.patch = patch
    _getStore = null
    return ret
  }
