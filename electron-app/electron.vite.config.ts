import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin()]
	},
	preload: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin({ protectedStrings: ['akljffoifiohop2p23t2jfio3jfio12oijoi;j3io;ojijLJG:SJGfoi;gSHOIF:ioh2o1th1o2hSHFIOS:Hoi;hfo2h908t1ht81hoihIhoih1hpFKLJFHSJKLFhsdkjlfSFsdp[fl[,{SDF,oisf;JSDf;ji;h12KLDFn'] })]
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
