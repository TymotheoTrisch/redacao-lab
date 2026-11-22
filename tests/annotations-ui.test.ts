// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AnnotationPanel from '../src/AnnotationPanel.vue'
import type { Annotation, Repository } from '../src/db'

const block = { id: 'conceito', text: '💡 Uma boa ideia.' }
const first: Annotation = { id: 'primeira', lessonId: 'tese', blockId: block.id,
  start: 3, end: 6, quote: 'Uma', color: 'blue', note: 'Rever' }
const orphan: Annotation = { ...first, id: 'antiga', blockId: 'outro', start: null, end: null,
  quote: 'Versão anterior', note: 'Preservada' }

function fakeRepo() {
  return {
    annotations: vi.fn(async (id: string): Promise<Annotation[]> => [first, orphan].filter(note => note.lessonId === id)),
    addAnnotation: vi.fn(), editAnnotation: vi.fn(), deleteAnnotation: vi.fn(),
  }
}
let wrapper: VueWrapper
async function setup(repo: ReturnType<typeof fakeRepo> | null) {
  wrapper = mount(AnnotationPanel, { attachTo: document.body,
    props: { lessonId: 'tese', block, repo: repo as unknown as Repository | null } })
  await flushPromises()
}
function button(label: string) {
  const target = wrapper.findAll('button').find(b => b.text() === label)
  if (!target) throw new Error('Botão ausente: ' + label)
  return target
}
afterEach(() => { wrapper.unmount(); window.getSelection()?.removeAllRanges() })

describe('anotações por trecho', () => {
  it('seleciona através de uma marcação existente e salva offsets UTF-16, cor e comentário', async () => {
    const repo = fakeRepo()
    await setup(repo)
    expect(wrapper.get('mark.blue').text()).toBe('Uma')
    const para = wrapper.get('.reading-text').element
    const range = document.createRange()
    range.setStart(para.querySelector('mark')!.firstChild!, 0)
    range.setEnd(para.lastElementChild!.firstChild!, 4)
    window.getSelection()!.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await flushPromises()
    await button('Anotar trecho').trigger('click')
    expect(wrapper.get('form blockquote').text()).toBe('Uma boa')
    await wrapper.get('select').setValue('green')
    await wrapper.get('textarea').setValue('Explicar')
    await wrapper.get('form').trigger('submit')
    expect(repo.addAnnotation).toHaveBeenCalledWith('tese', block.id, 3, 10, 'green', 'Explicar')
  })

  it('preserva a citação órfã e permite editar seu comentário', async () => {
    const repo = fakeRepo()
    await setup(repo)
    const row = wrapper.findAll('li')[1]!
    expect(row.text()).toContain('Trecho sem correspondência')
    expect(row.get('blockquote').text()).toBe(orphan.quote)
    await row.get('button').trigger('click')
    await wrapper.get('textarea').setValue('Revisada')
    await wrapper.get('form').trigger('submit')
    expect(repo.editAnnotation).toHaveBeenCalledWith(orphan.id, 'blue', 'Revisada')
  })

  it('pede confirmação antes de excluir e permite desistir', async () => {
    const repo = fakeRepo()
    await setup(repo)
    await button('Excluir').trigger('click')
    await button('Manter anotação').trigger('click')
    expect(repo.deleteAnnotation).not.toHaveBeenCalled()
    await button('Excluir').trigger('click')
    await button('Confirmar exclusão').trigger('click')
    expect(repo.deleteAnnotation).toHaveBeenCalledWith(first.id)
  })

  it('descarta uma consulta atrasada após a troca de aula', async () => {
    const repo = fakeRepo()
    let resolve!: (items: Annotation[]) => void
    repo.annotations.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    repo.annotations.mockResolvedValueOnce([])
    await setup(repo)
    await wrapper.setProps({ lessonId: 'argumentacao' })
    await flushPromises()
    resolve([first])
    await flushPromises()
    expect(repo.annotations).toHaveBeenLastCalledWith('argumentacao')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('mantém o rascunho após falha na gravação e permite repetir', async () => {
    const repo = fakeRepo()
    repo.editAnnotation.mockRejectedValueOnce(new Error('falha'))
    await setup(repo)
    await button('Editar').trigger('click')
    await wrapper.get('textarea').setValue('Guardar rascunho')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('Tente novamente')
    expect(wrapper.get('textarea').element.value).toBe('Guardar rascunho')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('exibe o texto sem oferecer gravação quando não há banco Android', async () => {
    await setup(null)
    expect(wrapper.get('.reading-text').text()).toBe(block.text)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
