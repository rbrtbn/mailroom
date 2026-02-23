import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	optimizeDeps: {
		exclude: ['@vitest/coverage-v8'],
	},
	test: {
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['**/*.spec.ts', '**/*.test.ts'],
		},
		projects: [
			defineConfig({
				test: {
					name: 'unit',
					include: ['**/*.test.ts'],
					alias: {
						'~': path.resolve(__dirname, 'src'),
					},
					environment: 'node',
					server: {
						deps: {
							external: ['@vitest/coverage-v8'],
						},
					},
				},
			}),
			defineWorkersConfig({
				test: {
					name: 'worker',
					include: ['**/*.spec.ts'],
					alias: {
						'~': path.resolve(__dirname, 'src'),
					},
					poolOptions: {
						workers: {
							wrangler: { configPath: './wrangler.jsonc' },
						},
					},
					server: {
						deps: {
							external: ['@vitest/coverage-v8'],
						},
					},
				},
			}),
		],
	},
});
