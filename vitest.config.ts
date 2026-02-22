import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			defineConfig({
				test: {
					name: 'unit',
					include: ['**/*.test.ts'],
					alias: {
						'~': path.resolve(__dirname, 'src'),
					},
					environment: 'node',
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
				},
			}),
		],
	},
});
