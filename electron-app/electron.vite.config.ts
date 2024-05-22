import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, bytecodePlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import crypto from 'crypto'

let nonce = crypto.randomBytes(16).toString('base64');

const transformHtmlPlugin = data => ({
	name: 'transform-html',
	transformIndexHtml: {
		transform(html)
		{
			return html.replace(
				/<%=\s*(\w+)\s*%>/gi,
				(match, p1) => data[p1] || ''
			);
		}
	}
});

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin()],
		server: {
			port: 33633,
			strictPort: true
		}
	},
	preload: {
		plugins: [externalizeDepsPlugin(), bytecodePlugin(
			{
				protectedStrings:
					[
						'12fasjkdF2owsnFvkwnvwe23dFSDfio2',	// API Encryption Key
						'ThisIsTheStartOfTheAPIKey!!!Yahooooooooooooo1234444321',
						'a;lfasl;fjklavnaklsfhsadkfhsaklfsaflasdknvasdklfwefhw;IFKSNVKLASDJNVH234]21O51[2[2112[24215'
					]
			})],
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
			vue({
				template: {
					compilerOptions: {
						isCustomElement: tag => tag.startsWith('ion-')
					}
				}
			}),
			transformHtmlPlugin({ nonce: nonce })
		],
		html: {
			cspNonce: nonce
		},
		server: {
			port: 33633,
			strictPort: true
		}
	},
})
