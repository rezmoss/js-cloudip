import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/embedded.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  splitting: false,
  shims: false,
});
