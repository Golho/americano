import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const buildTimestamp = new Date().toISOString();

export default defineConfig({
  plugins: [
    viteSingleFile(),
    {
      name: 'html-build-time',
      transformIndexHtml: (html) => html.replace('__BUILD_TIME__', buildTimestamp),
    },
  ],
  test: {
    environment: 'node',
  },
})
