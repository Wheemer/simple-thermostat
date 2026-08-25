import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'
import commonjs from '@rollup/plugin-commonjs'
import postCSS from 'rollup-plugin-postcss'
import postCSSLit from 'rollup-plugin-postcss-lit'
import postCSSPresetEnv from 'postcss-preset-env'
import inject from 'rollup-plugin-inject-process-env'
import { execFileSync } from 'node:child_process'

const BUILD_TARGET = process.env.BUILD_TARGET
const BUILD_TIME = (() => {
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  }

  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown-source-time'
  }
})()

const shared = (DEBUG) => [
  resolve({
    browser: true,
  }),
  commonjs(),
  json(),
  inject(
    {
      DEBUG,
      BUILD_TIME,
    },
    { exclude: '**/*.css' }
  ),
  typescript(),
  postCSS({
    plugins: [
      postCSSPresetEnv({
        stage: 1,
        features: {
          'nesting-rules': true,
          'custom-media-queries': true,
        },
      }),
    ],
    inject: true,
    extract: false,
  }),
  postCSSLit(),
]

const builds = [
  {
    input: 'src/simple-thermostat.ts',
    output: {
      dir: '.',
      entryFileNames: 'simple-thermostat.js',
      format: 'es',
      name: 'SimpleThermostat',
    },
    plugins: [
      ...shared(false),
      terser({
        output: {
          comments: false,
        },
      }),
    ],
  },
  {
    input: 'src/simple-thermostat.ts',
    output: {
      dir: '.',
      entryFileNames: 'simple-thermostat.debug.js',
      format: 'es',
      name: 'SimpleThermostat',
    },
    plugins: shared(true),
  },
]

export default builds.filter(({ output }) => {
  if (BUILD_TARGET === 'prod') {
    return output.entryFileNames === 'simple-thermostat.js'
  }
  if (BUILD_TARGET === 'debug') {
    return output.entryFileNames === 'simple-thermostat.debug.js'
  }
  return true
})
