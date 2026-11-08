import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			'@typed-css/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
		},
	},
	build: {
		target: 'es2022',
	},
});
