import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'
import copy from 'rollup-plugin-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
              plugins: [
                copy({
                  targets: [
                    {
                      src: 'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
                      dest: 'dist-electron/build/Release'
                    }
                  ],
                  hook: 'writeBundle'
                })
              ]
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
              plugins: [
                copy({
                  targets: [
                    {
                      src: 'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
                      dest: 'dist-electron/build/Release'
                    }
                  ],
                  hook: 'writeBundle'
                })
              ]
            }
          }
        }
      }
    ])
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5177,
    strictPort: true,
  },
  publicDir: 'assets',
}) 