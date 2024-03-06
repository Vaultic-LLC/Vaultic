import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin()]
	},
	preload: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin(
			{
				protectedStrings:
					[
						'X-AK',
						'12fasjkdF2owsnFvkwnvwe23dFSDfio2',
						'ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321',
						'a;lfasl;fjklavnaklsfhsadkfhsaklfsaflasdknvasdklfwefhw;IFKSNVKLASDJNVH234]21O51[2[2112[24215'
					]
			})]
	},
	renderer: {
		resolve: {
			alias: {
				'@renderer': resolve('src/renderer/src'),
			}
		},
		plugins: [
			vue({
				template: {
					compilerOptions: {
						isCustomElement: tag => tag.startsWith('ion-')
					}
				}
			})
		]
	},
})
