import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { personalProfile } from './build-tools/personal-profile'

export default defineConfig(({ command, mode }) => {
  const personal = mode === 'personal'
  if (personal && command !== 'build') throw new Error('O perfil pessoal está disponível apenas para build local.')
  return {
    plugins: [vue(), personalProfile(personal, resolve('Redacao-Lab-Dados-Referencia-Privados/reference-private'))],
    build: { outDir: personal ? '.tools/personal-web' : 'dist' },
    test: { include: ['tests/**/*.test.ts'] },
  }
})
