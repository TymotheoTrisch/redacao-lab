// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ImportPanel from '../src/ImportPanel.vue'

afterEach(() => vi.unstubAllGlobals())
it('acumula arquivos, mostra o resumo e só grava após confirmação explícita', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const onImport = vi.fn().mockResolvedValue(undefined)
  const wrapper = mount(ImportPanel, { props: { onImport } })
  const input = wrapper.get('input')
  async function select(name: string, data: unknown) {
    const json = JSON.stringify(data)
    Object.defineProperty(input.element, 'files', { configurable: true, value: [{ name, size: json.length, text: async () => json }] })
    await input.trigger('change')
  }
  const turn = { character: 'Guia sintético', message: 'Conte as faces do cubo.' }
  await select('modulo2.json', { messages: [{ id: 3, type: 'conversation', sequence: [turn] }] })
  expect(wrapper.text()).toContain('Falta selecionar modulo2_quiz.json')
  await select('modulo2_quiz.json', { moduleId: 2, title: 'Sólidos sintéticos', items: [{
    type: 'quiz', questionType: 'multiple-choice', question: 'Quantas faces tem o cubo?',
    explanation: 'São seis quadrados.', feedbackCorrect: turn, feedbackWrong: turn,
    options: [{ text: 'Seis', correct: true }, { text: 'Três', correct: false }],
  }] })
  await wrapper.findAll('button').find(b => b.text() === 'Conferir importação')!.trigger('click')
  await vi.waitFor(() => expect(wrapper.text()).toContain('Prévia da importação'))
  expect(onImport).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Sólidos sintéticos')
  await wrapper.findAll('button').find(b => b.text() === 'Confirmar importação')!.trigger('click')
  await flushPromises()
  expect(onImport).toHaveBeenCalledTimes(1)
  expect(wrapper.get('[role="status"]').text()).toContain('importadas')
  wrapper.unmount()
})
