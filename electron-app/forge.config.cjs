module.exports = {
	packagerConfig: {
		asar: {
			unpack: "*.{node,dylib,so}",
			unpackDir: "native_modules"
		},
		appBundleId: 'com.vaultic.vaultic',
		appVersion: '1.0.3',
		buildVersion: '1.0.3',
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
			  identity: 'Developer ID Application: Vaultic LLC (YU69N454M8)',
			  platform: 'darwin',
			  type: 'distribution',
			  provisioningProfile: 'Developer_ID_Application_Profile.provisionprofile',
			  optionsForFile: (filePath) => {
				const entitlements = filePath.includes('.app/') ? 'entitlements-child.plist' : 'entitlements.plist';
				return {
				  hardenedRuntime: true,
				  entitlements
				}
			  }
		},
		osxNotarize: {
			tool: 'notarytool',
			appleId: "tylerwanta123@gmail.com",
			appleIdPassword: "agdu-aski-xvad-dsdl",
			teamId: "YU69N454M8"
		  }
	},
	rebuildConfig: {
		onlyModules: ['sodium-native', 'sqlite3'],
		force: true,
		buildPath: './dist'
	},
	makers: [
		{
			name: '@electron-forge/maker-dmg',
			config: {
				format: 'ULFO'
			}
		},
		// {
		// 	name: '@electron-forge/maker-pkg',
		// 	platform: ['mas'],
		// 	config: {
		// 	  identity: '3rd Party Mac Developer Installer: Vaultic LLC (YU69N454M8)'
		// 	}
		//   }
	]
};