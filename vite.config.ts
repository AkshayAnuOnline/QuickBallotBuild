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
              external: ['electron', 'better-sqlite3', 'sharp'],
              plugins: [
                copy({
                  targets: [
                    {
                      src: 'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
                      dest: 'dist-electron/build/Release'
                    },
                    {
                      src: 'node_modules/@img/sharp-darwin-arm64/*/sharp.node',
                      dest: 'dist-electron/node_modules/@img/sharp-darwin-arm64/'
                    },
                    {
                      src: 'node_modules/@img/sharp-libvips-darwin-arm64/*/lib/*',
                      dest: 'dist-electron/node_modules/@img/sharp-libvips-darwin-arm64/lib/'
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
              external: ['electron', 'better-sqlite3', 'sharp'],
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
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
          'qr-vendor': ['qrcode', '@zxing/browser', '@zxing/library'],
          'ui-vendor': ['bootstrap', 'react-bootstrap'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    cssMinify: true,
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