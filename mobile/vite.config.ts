import { defineConfig } from 'vite'
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), babel(babelConfig)],
})
