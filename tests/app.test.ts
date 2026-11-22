// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from '../src/App.vue'
import { catalog } from '../src/catalog'

const first = catalog.modules[0].lessons[0]
const native = vi.hoisted(() => ({ platform: 'android' }))
const open = vi.hoisted(() => vi.fn())
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => native.platform } }))
vi.mock('../src/db', () => ({ openRepository: open }))

let app: VueWrapper
beforeEach(() => {
  native.platform = 'android'
  open.mockReset()
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => { app.unmount(); vi.unstubAllGlobals() })
async function launch() {
  app = mount(App, { global: { plugins: [createPinia()] } })
  await flushPromises()
}

it('retoma o bloco salvo e só confirma leitura após gravar no repositório', async () => {
  const repo = {
    preferences: async () => ({ examDate:'',minutes:20,days:[2],theme:'system' }),
    progress: async () => [{ lessonId:first.id,blockId:first.blocks[1].id,status:'reading' }],
    reviews: async () => [], annotations: async () => [], saveProgress: vi.fn()
  }
  open.mockResolvedValue(repo)
  await launch()
  await app.get('.resume').trigger('click')
  await flushPromises()
  expect(app.get('.reading-text').text()).toBe(first.blocks[1].text)
  expect(repo.saveProgress).toHaveBeenCalledWith(first.id,first.blocks[1].id)
})

it('permite nova tentativa quando o SQLite está indisponível sem simular gravações', async () => {
  open.mockRejectedValue(new Error('Banco indisponível'))
  await launch()
  expect(app.find('[role="alert"]').exists()).toBe(true)
  expect(app.find('.row').exists()).toBe(false)
  await app.get('main button').trigger('click')
  await flushPromises()
  expect(open).toHaveBeenCalledTimes(2)
})

it('busca sem acentos no navegador e permite conferir o exercício da aula', async () => {
  native.platform = 'web'
  await launch()
  await app.get('input[type=search]').setValue('argumentacao')
  expect(app.get('.module').text()).toContain('Argumentação')
  await app.get('.row').trigger('click')
  await flushPromises()
  expect(app.find('.practice article').exists()).toBe(true)
  expect(app.find('.annotations form').exists()).toBe(false)
  expect(open).not.toHaveBeenCalled()
})

