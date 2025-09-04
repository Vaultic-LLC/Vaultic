module.exports = {
	packagerConfig: {
		asar: true,
		appBundleId: 'com.vaultic.vaultic',
		appVersion: '1.0.0',
		buildVersion: '1.0.0',
		icon: './resources/icon',
		ignore: [
			/^\/src/,
			/(.eslintrc.json)|(.gitignore)|(electron.vite.config.ts)|(forge.config.cjs)|(tsconfig.*)/,
		],
		osxSign: {
			identity: 'Apple Distribution: Vaultic LLC (YU69N454M8)',
			platform: 'mas',
			type: 'distribution',
			provisioningProfile: 'Vaultic_Mac_App_Distribution.provisionprofile',
			entitlements: './entitlements.plist',
			// optionsForFile: (filePath) => {
			// 	if (filePath.endsWith('Vaultic.app')) 
			// 	{
			// 		return {
			// 			entitlements: path.resolve(__dirname, './entitlements.plist'),
			// 			hardenedRuntime: true,
			// 		}
			// 	}

			// 	if (filePath.endsWith('Vaultic Helper (GPU).app')) 
			// 	{
			// 		return {
			// 			entitlements: path.resolve(__dirname, './entitlements.gpu.plist'),
			// 			hardenedRuntime: true,
			// 		}
			// 	}

			// 	if (filePath.endsWith('Vaultic Helper (Plugin).app')) 
			// 	{
			// 		return {
			// 			entitlements: path.resolve(__dirname, './entitlements.plugin.plist'),
			// 			hardenedRuntime: true,
			// 		}
			// 	}

			// 	if (filePath.endsWith('Vaultic Helper (Renderer).app')) 
			// 	{
			// 		return {
			// 			entitlements: path.resolve(__dirname, './entitlements.renderer.plist'),
			// 			hardenedRuntime: true,
			// 		}
			// 	}

			// 	if (filePath.endsWith('Vaultic Helper.app')) 
			// 	{
			// 		return {
			// 			entitlements: path.resolve(__dirname, './entitlements.renderer.plist'),
			// 			hardenedRuntime: true,
			// 		}
			// 	}

			// 	return {
			// 		entitlements: path.resolve(__dirname, './entitlements.plist'),
			// 		hardenedRuntime: true,
			// 	}
			// }
		}
	},
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {},
		},
		// {
		// 	name: '@electron-forge/maker-zip',
		// 	platforms: ['darwin'],
		// },
		{
			name: '@electron-forge/maker-deb',
			config: {},
		},
		{
			name: '@electron-forge/maker-rpm',
			config: {},
		},
		{
			name: '@electron-forge/maker-pkg',
			config: {
			  identity: '3rd Party Mac Developer Installer: Vaultic LLC (YU69N454M8)'
			}
		  }
	],
};
