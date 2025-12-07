import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import babel from 'vite-plugin-babel';

const babelConfig =
{
	babelConfig:
	{
		babelrc: false,
		configFile: false,
		plugins: [
			'@babel/plugin-transform-class-properties',
			'@babel/plugin-transform-classes',
			'@babel/plugin-transform-object-rest-spread'
		]
	}
};

export default defineConfig({
	main: {
		plugins: [babel(babelConfig), externalizeDepsPlugin()],
		server: {
			port: 33633,
			strictPort: true
		}
	},
	preload: {
		plugins: [babel(babelConfig), externalizeDepsPlugin()],
		server: {
			port: 33633,
			strictPort: true
		}
	},
	renderer: {
		resolve: {
			alias: {
				'@renderer': resolve('src/renderer/src'),
			}
		},
		plugins: [
			babel(babelConfig),
			vue({
				template: {
					compilerOptions: {
						isCustomElement: tag => tag.startsWith('ion-')
					}
				}
			})
		],
		server: {
			port: 33633,
			strictPort: true
		}
	},
})
