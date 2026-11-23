import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { buildPrivateCatalog } from '../src/privateCatalog'

const profileId = 'virtual:redacao-profile'
const dataId = 'virtual:redacao-personal-content'

export function personalProfile(personal: boolean, root: string): Plugin {
  return {
    name: 'redacao-build-profile',
    resolveId(id) {
      if (id === profileId || (personal && id === dataId)) return '\0' + id
    },
    async load(id) {
      if (id === '\0' + profileId) {
        if (!personal) return 'export const moduleIds = []; export const loadPack = () => Promise.resolve(null);'
        const ids = Array.from({ length: 15 }, (_, i) => 'pr-mod-' + (i + 1))
        return 'export const moduleIds = ' + JSON.stringify(ids) + '; export const loadPack = () => import("' + dataId + '").then(m => m.default);'
      }
      if (!personal || id !== '\0' + dataId) return
      const files = []
      for (let n = 1; n <= 15; n++) {
        for (const [dir,name] of [['conversa', 'modulo' + n + '.json'], ['quiz', 'modulo' + n + '_quiz.json']]) {
          const path = join(root, dir, name)
          const info = await stat(path).catch(() => { throw new Error('O perfil pessoal exige os 15 pares locais de conversa e quiz.') })
          files.push({ name, size: info.size, text: () => readFile(path, 'utf8') })
        }
      }
      const pack = await buildPrivateCatalog(files)
      return 'export default ' + JSON.stringify(pack)
    },
  }
}
