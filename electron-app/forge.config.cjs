module.exports = {
	packagerConfig: {
		asar: {
			unpack: "*.{node,dylib,so}",
			unpackDir: "native_modules"
		},
		appBundleId: 'com.vaultic.vaultic',
		appVersion: '1.0.2',
		buildVersion: '1.0.2',
		icon: './resources/icon',
		ignore: [
			/^\/src/,
			/(.eslintrc.json)|(.gitignore)|(electron.vite.config.ts)|(forge.config.cjs)|(tsconfig.*)/,
		],
		osxSign: {
			binaries: [
				'./resources/bin/ffmpeg_intel_mac',
				'./resources/bin/ffmpeg_mac'
			  ],
			  identity: 'Apple Distribution: Vaultic LLC (YU69N454M8)',
			  platform: 'mas',
			  type: 'distribution',
			  provisioningProfile: 'New_Distribution_Provisioning_Profile.provisionprofile',
			  optionsForFile: (filePath) => {
				const entitlements = filePath.includes('.app/') ? 'entitlements-child.plist' : 'entitlements.plist';
				return {
				  hardenedRuntime: false,
				  entitlements
				}
			  }
		}
	},
	rebuildConfig: {
		onlyModules: ['better-sqlite3', 'sodium-native', 'sqlite3'],
		force: true,
		buildPath: './dist'
	},
	makers: [
		// {
		// 	name: '@electron-forge/maker-dmg',
		// 	config: {
		// 		format: 'ULFO'
		// 	}
		// },
		{
			name: '@electron-forge/maker-pkg',
			platform: ['mas'],
			config: {
			  identity: '3rd Party Mac Developer Installer: Vaultic LLC (YU69N454M8)'
			}
		  }
	]
};
