import { Visitor, NodePath } from '@babel/traverse'
import * as t from '@babel/types'

interface Opts {
  prefix?: string
  notTransformObject?: boolean
}

const args = t.identifier('args')
const buildFn = (propName: string, node: any) => t.arrowFunctionExpression(
  [args],
  t.blockStatement([
    t.expressionStatement(
      t.assignmentExpression('=', args, t.memberExpression(
        t.memberExpression(args, t.identifier('target')),
        t.identifier(propName)
      ))
    ),
    t.expressionStatement(
      t.assignmentExpression('=', node, t.conditionalExpression(
        t.binaryExpression('===', t.unaryExpression('typeof', node), t.stringLiteral('number')),
        t.unaryExpression('+', args),
        args
      ))
    )
  ])
)

export default (): { visitor: Visitor } => ({
  visitor: {
    JSXOpeningElement (p, { opts }: { opts: Opts }) {
      const prefix = opts.prefix || 'r'
      const len = prefix.length
      let propName = 'value'
      let attr: NodePath<t.JSXAttribute>
      p.get('attributes').forEach(it => {
        if (!it.isJSXAttribute()) return
        const nameNode = it.get('name')
        if (Array.isArray(nameNode) || !nameNode.isJSXIdentifier()) return
        const v = it.get('value')
        if (Array.isArray(v)) return
        const name = nameNode.node.name
        if (name === 'type' && v.isStringLiteral()) {
          const type = v.node.value
          if (type === 'checkbox' || type === 'radio') propName = 'checked'
        }
        if (!name.startsWith(prefix)) return
        switch (name.slice(len)) {
          case 'Model':
            attr = it
            break
          case 'PropName':
            v.assertStringLiteral()
            propName = (v.node as t.StringLiteral).value
            it.remove()
            break
        }
      })
      if (!attr) return
      const value = attr.get('value')
      if (value.isJSXExpressionContainer() && propName) {
        const v = value.get('expression')
        if (!Array.isArray(v) && (v.isMemberExpression() || v.isIdentifier())) {
          p.node.attributes.unshift(
            t.jsxAttribute(t.jsxIdentifier(propName), value.node),
            t.jsxAttribute(t.jsxIdentifier('onChange'), t.jsxExpressionContainer(buildFn(propName, v.node)))
          )
          attr.remove()
          return
        }
      }
      attr.remove()
      throw value.buildCodeFrameError('Unsupported expression.')
    },
    ObjectExpression (p, { opts }: { opts: Opts }) {
      if (opts.notTransformObject) return
      const prefix = opts.prefix || 'r'
      const len = prefix.length
      let propName = 'value'
      let attr: NodePath<t.ObjectProperty>
      p.get('properties').forEach(it => {
        if (!it.isObjectProperty()) return
        const key = it.get('key') as NodePath<t.Identifier>
        if (!key.isIdentifier()) return
        const name = key.node.name
        const v = it.get('value')
        if (name === 'type' && !Array.isArray(v) && v.isStringLiteral()) {
          const type = v.node.value
          if (type === 'checkbox' || type === 'radio') propName = 'checked'
        }
        switch (name.slice(len)) {
          case 'Model':
            attr = it
            break
          case 'PropName':
            if (Array.isArray(v)) break
            v.assertStringLiteral()
            propName = (v.node as t.StringLiteral).value
            it.remove()
            break
        }
      })
      if (!attr) return
      const value = attr.get('value')
      if (propName && (value.isMemberExpression() || value.isIdentifier())) {
        p.node.properties.unshift(
          t.objectProperty(t.identifier(propName), value.node),
          t.objectProperty(t.identifier('onChange'), buildFn(propName, value.node))
        )
        attr.remove()
        return
      }
      attr.remove()
      throw value.buildCodeFrameError('Unsupported expression.')
    }
  }
})
