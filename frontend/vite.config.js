import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // ✅ Remover /Passagem-de-turno
  server: {
    port: 5173
  }
})