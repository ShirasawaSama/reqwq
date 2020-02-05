import React, { createContext, useState, useContext, Context, createElement as c, Component, PureComponent } from 'react'

declare module 'react' {
  interface Attributes {
    rModel?: string | boolean | number
    rPropName?: string
  }
}

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
const REACT_COMPONENT = Symbol('reactComponent')
export const NOT_PROXY = Symbol('notProxy')

interface Ctx { ids: Map<typeof Store, number>, contexts: Array<Context<null>>, stores: Store[] }
const G = createContext(null as Ctx)

let _getStore: any
const TEXT = 'Initialization is not complete yet.'
export const getStore = <T extends typeof Store> (store: T) => (_getStore && _getStore(store)) || new Proxy({}, {
  get (_, key) { /* istanbul ignore next */ if (key === STORE) return store; else throw new Error(TEXT) },
  set () { throw new Error(TEXT) }
}) as InstanceType<T>
export const injectStore = <T extends typeof Store> (store: T) => (t: any, key: string) => (t[key] = getStore(store))
export const withStores = <T extends { [key: string]: typeof Store }> (stores: T,
  mapping?: (t: { [key in keyof T]: InstanceType<T[key]> }, props: any) => any) => (C: typeof Component) => {
    const F: React.FC = props => {
      const ctx = useContext(G)
      const obj: any = { }
      for (const i in stores) {
        const id = ctx.ids.get(stores[i])
        useContext(ctx.contexts[id])
        obj[i] = ctx.stores[id]
      }
      /* istanbul ignore next */
      return c(C, Object.assign(new Object(), props, (mapping && mapping(obj, props)) || obj))
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

export const isReactInternal = (p: string) => {
  /* istanbul ignore next */ switch (p) {
    case 'updater': case '_reactInternalFiber': case '_reactInternalInstance': case 'refs':
    case 'context': case 'props': case 'state': return true
    default: return false
  }
}
const handlers: ProxyHandler<any> = {
  get (target, p, r) {
    if (target[REACT_COMPONENT] && isReactInternal(p as string)) return target[p]
    if (p === PROXY) return target[PROXY]
    if (typeof target[PROXY][p] !== 'undefined') return target[PROXY][p]
    const v = Reflect.get(target, p, r)
    if (p === 'toJSON') return v || (() => target)
    /* istanbul ignore next */ else if (p == null) return v
    switch (typeof v) {
      case 'object': return v[NOT_PROXY] || v[PROXY]
        ? v : (target[PROXY][p] = createProxy(v, target[ON_CHANGE], target[ROOT], target, p))
      case 'function': return target[BASE] ? (target[PROXY][p] = v.bind(target[BASE])) : v
      default: return v
    }
  },
  set (target, p, v, r) {
    if (Object.is(Reflect.get(target, p, r), v)) return true
    const re = Reflect.set(target, p, v, r)
    /* istanbul ignore next */ if (re) target[ON_CHANGE](target)
    return re
  },
  deleteProperty (target, p) {
    const re = Reflect.deleteProperty(target, p)
    /* istanbul ignore next */ if (re) target[ON_CHANGE](target)
    /* istanbul ignore next */ if (typeof target[PROXY][p] !== 'undefined') delete target[PROXY][p]
    return re
  }
}
export const createProxy = <T> (s: T, onChange: (target: any) => void, id?: number, parent?: any, key?: any) => {
  s[PROXY] = new Object()
  s[PARENT] = parent
  s[KEY] = key
  s[ON_CHANGE] = onChange
  if (id != null) s[ROOT] = id
  const re = new Proxy(s, handlers)
  if (!key) s[BASE] = re
  return re as T
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
        curV[PROXY] = parent[PROXY][k] = undefined
        parent[k] = /* istanbul ignore next */ Array.isArray(curV) ? curV.slice() : Object.assign(new Object(), curV)
      })
      for (const id in modifiedList) flags[id] = !flags[id]
      modifiedList = {}
      updates.clear()
      modified = false
      /* istanbul ignore next */ if (update) update(!flag)
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
      const len = arguments.length
      for (var j = 0; j < len; j++) {
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

let hasModified = false
const updateList = new Set<any>()
export const createOutsideStore = <T> (store: T, onChange?: () => void) => {
  const patch = () => {
    updateList.forEach(u => {
      const parent = u[PARENT]
      if (!parent) return
      const k = u[KEY]
      const curV = parent[k]
      curV[PROXY] = parent[PROXY][k] = undefined
      parent[k] = Array.isArray(curV) ? curV.slice() : Object.assign(new Object(), curV)
    })
    updateList.clear()
    hasModified = false
    /* istanbul ignore next */ if (onChange) onChange()
  }
  const proxy = createProxy(store, target => {
    updateList.add(target)
    if (hasModified) return
    hasModified = true
    new Promise(resolve => resolve()).then(patch)
  })
  ;(proxy as any).patch = patch
  return proxy as T & { patch (): void }
}

export const useOutsideStore = <T> (fn: () => T): T & { patch (): void } => {
  const ret = useState(false)
  const ref2 = React.useRef<any>()
  ref2.current = ret
  const ref = React.useRef<any>()
  if (!ref.current) ref.current = createOutsideStore(fn(), () => ref2.current[1](!ref2.current[0]))
  return ref.current
}

export class ComponentWithStore extends Component {
  public readonly [REACT_COMPONENT] = true
  public readonly patch: () => void
  constructor (a: any, b: any) {
    super(a, b)
    return createOutsideStore(this, () => this.forceUpdate())
  }
}
export class PureComponentWithStore extends PureComponent {
  public readonly [REACT_COMPONENT] = true
  public readonly patch: () => void
  constructor (a: any, b: any) {
    super(a, b)
    return createOutsideStore(this, () => this.forceUpdate())
  }
}
