/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Embedded builds are served by the DefraDB node under a sub-path
  // (e.g. /explorer/), so assets must resolve relative to the page.
  base: process.env.VITE_EMBEDDED === '1' ? './' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
