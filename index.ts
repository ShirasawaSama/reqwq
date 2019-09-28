import { createDraft, finishDraft, immerable } from 'immer/src/index'
import { DRAFT_STATE, assign, shallowCopy } from 'immer/src/common'
import React, { createContext, useState, useContext, createElement as c } from 'react'

const MODELS: unique symbol = (typeof Symbol === 'undefined'
  ? /* istanbul ignore next */ { models: true } : Symbol('models')) as any

export const useModel = <T extends typeof Model, I = InstanceType<T>> (model: T) => {
  const m = useContext(G)
  const ctx = m.contexts[m.ids.get(model)]
  if (!ctx) throw new Error('No such model: ' + /* istanbul ignore next */ (model && ((model as any).name || model)))
  return useContext(ctx) as any as { [key in keyof(I)]: I[key] extends (...args: any[]) => any ? Func<I[key]> : I[key] }
}

export type ExtractType<T> =
  T extends { [Symbol.iterator] (): { next (): { done: true, value: infer U } } } ? U :
  T extends { [Symbol.iterator] (): { next (): { done: false } } } ? never :
  T extends { [Symbol.iterator] (): { next (): { value: infer U } } } ? U :
  T extends { [Symbol.iterator] (): any } ? any : never
export type Func <I extends (...args: any[]) => IterableIterator<any> | any> = I extends (...args: infer P) =>
  IterableIterator<infer R> ? (...args: P) => R extends Promise<any> ? R : Promise<ExtractType<R>> : I
export type GetModel = <M extends typeof Model, I = InstanceType<M>> (model: M) =>
  () => { [key in keyof(I)]: I[key] extends (...args: any[]) => any ? Func<I[key]> : I[key] }
export class Model {
  public [MODELS]: GetModel
  public getModel <M extends typeof Model> (model: M) { return () => this[MODELS](model)() }
}
Model[immerable] = true
function V (v: any) { this.value = v }
const G = createContext(null as { ids: Map<typeof Model, number>, contexts: Array<React.Context<Model>> })

type Ret = React.FC & { getModel: GetModel, addModels: (...models: Array<Model | typeof Model>) => void }
export const getProvider: (...models: Array<Model | typeof Model>) => Ret = function () {
  let update: (data: boolean) => void = null
  let flag = false
  const ids = new Map<typeof Model, number>()
  const models: Model[] = []
  const contexts: Array<React.Context<Model>> = []
  const value = new V({ ids, contexts })
  const getModel = <M extends typeof Model> (model: M) => () => {
    const v = models[ids.get(model)]
    if (!v) throw new Error('No such model: ' + /* istanbul ignore next */ (model && ((model as any).name || model)))
    return v as InstanceType<M>
  }
  function addModel () {
    let j = arguments.length
    while (j--) {
      const it = arguments[j]
      const src = it instanceof Model ? it : new it()
      let model = src
      let i = 0
      const proto = Object.getPrototypeOf(model)
      const modelClass = proto.constructor as typeof Model
      if (ids.has(modelClass)) {
        /* istanbul ignore next */
        throw new Error('The model already exists: ' + ((modelClass as any).name || modelClass))
      }
      Object.getOwnPropertyNames(proto).forEach(name => {
        const f = src[name]
        if (name !== 'constructor' && name !== 'getModel' && typeof f === 'function') {
          src[name] = function () {
            if (i === 0) model = createDraft(model)
            i++
            let result: any
            try {
              result = f.apply(model, arguments)
              if (result && i === 1 && typeof result.next === 'function') {
                i = Infinity
                const gen = result
                let ree: (arg: any) => void
                let rej: (arg: Error) => void
                result = new Promise((resolve, reject) => {
                  ree = resolve
                  rej = reject
                })
                ;(function next (res?: any) {
                  let { value: v, done } = gen.next(res) /* tslint:disable-line */
                  const s = model[DRAFT_STATE]
                  const modified = s.modified
                  if (done) {
                    i = 0
                    models[ids.get(modelClass)] = model = finishDraft(model)
                    if (modified) update(!flag)
                    ree(v)
                  } else {
                    if (modified) {
                      s.copy = s.base = assign(shallowCopy(models[ids.get(modelClass)] = s.copy), s.drafts)
                      update(!flag)
                    }
                    if (Array.isArray(v)) v = Promise.all(v)
                    if (v && typeof v.then === 'function') {
                      v.then(next, (e: any) => {
                        try { gen.throw(e) } catch (o) {
                          i = 0
                          rej(e)
                        }
                      })
                    } else {
                      try { next(v) } catch (e) {
                        i = 0
                        rej(e)
                      }
                    }
                  }
                })()
              } else i--
            } catch (e) {
              i = 0
              throw e
            } finally {
              if (i === 0 && model[DRAFT_STATE] && model[DRAFT_STATE].revoke) {
                const modified = model[DRAFT_STATE].modified
                models[ids.get(modelClass)] = model = finishDraft(model)
                if (modified) update(!flag)
              }
            }
            return result
          }
        }
      })
      model.getModel = model[MODELS] = getModel
      ids.set(modelClass, models.push(model) - 1)
      contexts.push(createContext(null as Model))
    }
    if (update) update(!flag)
  }
  addModel.apply(null, arguments)
  const ret = (props: React.PropsWithChildren<{}>) => {
    const v = useState(flag)
    flag = v[0]
    update = v[1]
    return c(G.Provider, value, contexts.reduceRight((p, t, i) => c(t.Provider, new V(models[i]), p), props.children))
  }
  ret.getModel = getModel
  ret.addModels = addModel
  return ret as any
}
