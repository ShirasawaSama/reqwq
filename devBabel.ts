import { transform } from '@babel/core'
import plugin from './babel'

console.log(transform(`
React.createElement('a', { rModel: this.i, type: 'checkbox' })
`, { presets: ['@babel/preset-react'], plugins: [plugin] }))
