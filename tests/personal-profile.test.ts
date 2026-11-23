import { build } from 'vite'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { personalProfile } from '../build-tools/personal-profile'

async function buildWithoutPrivateFiles(personal: boolean) {
  const absentRoot = join(tmpdir(), crypto.randomUUID())
  return build({
    configFile: false, publicDir: false, logLevel: 'silent',
    plugins: [personalProfile(personal,absentRoot), {
      name:'entrada-de-teste',
      resolveId(id) { if (id === 'virtual:test-profile') return '\0' + id },
      load(id) { if (id === '\0virtual:test-profile') return "import {loadPack} from 'virtual:redacao-profile'; loadPack()" },
    }],
    build: { write:false, rollupOptions:{input:'virtual:test-profile'} },
  })
}

describe('isolamento dos perfis de distribuição', () => {
  it('compila a entrada pública sem a pasta privada e sem chunk de referências', async () => {
    const result = await buildWithoutPrivateFiles(false)
    if (Array.isArray(result) || !('output' in result)) throw new Error('Saída inesperada')
    expect(result.output).toHaveLength(1)
    expect(result.output[0].code).not.toContain('pr-mod-')
  })
  it('interrompe o build pessoal quando os pares locais estão ausentes', async () => {
    await expect(buildWithoutPrivateFiles(true)).rejects.toThrow('15 pares locais')
  })
})
