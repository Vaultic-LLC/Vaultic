require('dotenv').config();

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
	]
};
