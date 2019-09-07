import { createDraft, finishDraft, immerable } from 'immer/src/index'
import { DRAFT_STATE, assign, shallowCopy } from 'immer/src/common'
import React, { createContext, useState, useContext, createElement as c } from 'react'

export const useModel = <T extends typeof Model> (model: T) => {
  const m = useContext(G)
  const ctx = m.contexts[m.ids.get(model)]
  if (!ctx) throw new Error('No such model: ' + model)
  return useContext(ctx) as InstanceType<T>
}

export class Model { public getModel: <M extends typeof Model> (model: M) => InstanceType<M> }
Model[immerable] = true
function V (v: any) { this.value = v }
const G = createContext(null as { ids: Map<typeof Model, number>, contexts: Array<React.Context<Model>> })

export const getProvider: (...models: Array<Model | typeof Model>) => React.FC = function () {
  let update: (data: boolean) => void = null
  let flag = false
  const ids = new Map<typeof Model, number>()
  const models: Model[] = []
  const contexts: Array<React.Context<Model>> = []
  const value = new V({ ids, contexts })
  const getModel = <M extends typeof Model> (model: M) => {
    const v = models[ids.get(model)]
    if (!v) throw new Error('No such model: ' + model)
    return v as InstanceType<M>
  }
  let j = arguments.length
  while (j--) {
    const it = arguments[j]
    const src = it instanceof Model ? it : new it()
    let model = src
    let i = 0
    const proto = Object.getPrototypeOf(model)
    const modelClass = proto.constructor as typeof Model
    if (ids.has(modelClass)) throw new Error('The model already exists: ' + modelClass)
    Object.getOwnPropertyNames(proto).forEach(name => {
      const f = src[name]
      if (name !== 'constructor' && typeof f === 'function') {
        src[name] = function () {
          if (i === 0) model = createDraft(model)
          i++
          let result: any
          try {
            result = f.apply(model, arguments)
            if (i === 1 && typeof result.next === 'function') {
              i = Infinity
              ;(function next (res?: any) {
                const { value: v, done } = result.next(res)
                const s = model[DRAFT_STATE]
                const modified = s.modified
                if (done) {
                  i = 0
                  models[ids.get(modelClass)] = model = finishDraft(model)
                  if (modified) update(!flag)
                } else {
                  if (modified) {
                    s.copy = s.base = assign(shallowCopy(models[ids.get(modelClass)] = s.copy), s.drafts)
                    update(!flag)
                  }
                  if (!v || typeof v.then !== 'function') {
                    try { next(v) } catch (e) {
                      i = 0
                      throw e
                    }
                  } else (Array.isArray(v) ? Promise.all(v) : v).then(next, (e: any) => result.throw(e))
                }
              })()
            } else i--
          } catch (e) {
            i = 0
            throw e
          } finally {
            if (i === 0 && model[DRAFT_STATE].revoke) {
              const modified = model[DRAFT_STATE].modified
              models[ids.get(modelClass)] = model = finishDraft(model)
              if (modified) update(!flag)
            }
          }
          return result
        }
      }
    })
    model.getModel = getModel
    ids.set(modelClass, models.push(model) - 1)
    contexts.push(createContext(null as Model))
  }
  return ((props: React.PropsWithChildren<{}>) => {
    const v = useState(flag)
    flag = v[0]
    update = v[1]
    return c(G.Provider, value, contexts.reduceRight((p, t, i) => c(t.Provider, new V(models[i]), p), props.children))
  }) as any
}
