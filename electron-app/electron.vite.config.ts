import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'

import commonjsExternals from "vite-plugin-commonjs-externals";
import { builtinModules } from 'module';

import pkg from './package.json';
// let commonjsPackages = [
// 	'electron',
// 	'electron/main',
// 	'electron/common',
// 	'electron/renderer',
// 	'original-fs',
// 	'os',
// 	...builtinModules,
// 	...Object.keys(pkg.dependencies).map(
// 		name => new RegExp('^' + escapeRegExp(name) + '(\\/.+)?$')
// 	),
// ];

import { nodePolyfills } from 'vite-plugin-node-polyfills'


export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()]
	},
	preload: {
		plugins: [externalizeDepsPlugin()]
	},
	renderer: {
		resolve: {
			alias: {
				'@renderer': resolve('src/renderer/src'),
			}
		},
		plugins: [
			vue(),
			nodePolyfills()
		],
	},
})
