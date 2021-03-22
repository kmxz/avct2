// Copied from https://github.com/PolymerLabs/lit-element-starter-ts/blob/fddb011/rollup.config.js

import summary from 'rollup-plugin-summary';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { parseLiterals } from 'parse-literals';

export default {
  input: 'index.js',
  output: {
    file: 'index.bundled.js',
    format: 'esm',
  },
  onwarn(warning) {
    if (warning.code !== 'THIS_IS_UNDEFINED') {
      console.error(`(!) ${warning.message}`);
    }
  },
  plugins: [
    replace({'Reflect.decorate': 'undefined'}),
    minifyHTML({
        options: {
            parseLiterals: str => parseLiterals(str).map(single => ({ 
                ...single,
                parts: single.parts.map(part => { console.warn(part); return part; })
            }))
        }
    }),
    resolve(),
    summary(),
  ],
};