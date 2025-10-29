import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	test: {
		includeSource: ['src/**/*.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.ts'],
		env: loadEnv('', process.cwd(), ''),
		testTimeout: 10000,
		setupFiles: ['./vitest-setup.ts'],
		server: {
			deps: {
				inline: []
			}
		},
		deps: {
			interopDefault: true
		}
	},
	resolve: {
		conditions: ['browser']
	}
});
