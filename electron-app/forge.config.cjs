require('dotenv').config();

module.exports = {
	packagerConfig: {
		asar: {
			unpack: "*.{node,dylib,so}",
			unpackDir: "native_modules"
		},
		appBundleId: 'com.vaultic.vaultic',
		appVersion: '1.2.1',
		buildVersion: '1.2.1',
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
			identity: process.env.APPLE_IDENTITY,
			hardenedRuntime: true,
			entitlements: 'entitlements.plist',
			'entitlements-inherit': 'entitlements-child.plist',
			'signature-flags': 'library'
		},
		osxNotarize: {
			tool: 'notarytool',
			appleId: process.env.APPLE_ID,
			appleIdPassword: process.env.APPLE_ID_PASSWORD,
			teamId: process.env.APPLE_TEAM_ID
		}
	},
	rebuildConfig: {
		onlyModules: ['better-sqlite3', 'sodium-native', 'sqlite3'],
		force: true,
		buildPath: './dist'
	},
	makers: [
		{
			name: '@electron-forge/maker-dmg',
			config: {
				format: 'ULFO',
				icon: "./resources/icon.icns",
			}
		},
		{
			name: '@electron-forge/maker-zip',
		},
		{
			name: '@electron-forge/maker-msix',
			config: {
				manifestVariables: {
					appDisplayName: 'Vaultic',
					publisherDisplayName: 'Vaultic LLC',
					publisher: 'CN=73FC5DA3-F3CD-411E-802D-2281556736A6',
					packageMinOSVersion: '10.0.19041.0',
					packageIdentity: 'VaulticLLC.Vaultic',
				},
				icon: "./resources/icon.ico",
				packageAssets: "./resources/msix-assets",
			}
		}
	]
};
