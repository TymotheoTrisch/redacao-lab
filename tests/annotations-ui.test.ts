// @vitest-environment jsdom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import AnnotationPanel from '../src/AnnotationPanel.vue'
import type { Annotation, Repository } from '../src/db'

const block = { id: 'conceito', text: '💡 Uma boa ideia.' }
const first: Annotation = { id: 'primeira', lessonId: 'tese', blockId: block.id,
  start: 3, end: 6, quote: 'Uma', color: 'blue', note: 'Rever' }
const orphan: Annotation = { ...first, id: 'antiga', blockId: 'outro', start: null, end: null,
  quote: 'Versão anterior', note: 'Preservada' }

// JSDOM ainda não executa as APIs de abertura/fechamento de dialog do navegador.
const showModal = vi.fn(function(this:HTMLDialogElement) { this.open = true })
const close = vi.fn(function(this:HTMLDialogElement) { this.open = false })
const originalDialogMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype)
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal:{value:showModal,configurable:true}, close:{value:close,configurable:true},
  })
})
afterAll(() => {
  for (const key of ['showModal','close'] as const) {
    const original = originalDialogMethods[key]
    if (original) Object.defineProperty(HTMLDialogElement.prototype,key,original)
    else Reflect.deleteProperty(HTMLDialogElement.prototype,key)
  }
})

function fakeRepo() {
  return {
    annotations: vi.fn(async (id: string): Promise<Annotation[]> => [first, orphan].filter(note => note.lessonId === id)),
    addAnnotation: vi.fn(), editAnnotation: vi.fn(), deleteAnnotation: vi.fn(),
  }
}
let wrapper: VueWrapper
async function setup(repo: ReturnType<typeof fakeRepo> | null, notes?: Annotation[]) {
  wrapper = mount(AnnotationPanel, { attachTo: document.body,
    props: { lessonId: 'tese', block, repo: repo as unknown as Repository | null, notes } })
  await flushPromises()
}
function button(label: string) {
  const target = wrapper.findAll('button').find(b => b.text() === label)
  if (!target) throw new Error('Botão ausente: ' + label)
  return target
}

async function selectRange() {
  const para = wrapper.get('.reading-text').element
  const range = document.createRange()
  range.setStart(para.querySelector('mark')!.firstChild!, 0)
  range.setEnd(para.lastElementChild!.firstChild!, 4)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
  await flushPromises()
}

afterEach(() => { wrapper.unmount(); window.getSelection()?.removeAllRanges() })

describe('anotações por trecho', () => {
  it('abre edição com showModal, nome acessível e foco no título; Escape volta ao destaque', async () => {
    const repo = fakeRepo()
    await setup(repo)
    const mark = wrapper.get<HTMLElement>('mark')
    mark.element.focus()
    await mark.trigger('keydown.enter')
    await flushPromises()
    const dialog = wrapper.get<HTMLDialogElement>('dialog[open]')
    expect(showModal.mock.instances).toContain(dialog.element)
    const title = document.getElementById(dialog.attributes('aria-labelledby') ?? '')
    expect(title?.textContent).toBe('Editar anotação')
    expect(document.activeElement).toBe(title)
    expect(document.documentElement.style.overflow).toBe('hidden')
    await dialog.trigger('cancel')
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(document.activeElement).toBe(mark.element)
    expect(document.documentElement.style.overflow).toBe('')
    expect(repo.editAnnotation).not.toHaveBeenCalled()
  })

  it('mantém o modal e rascunho durante a gravação e anuncia a falha dentro dele', async () => {
    const repo = fakeRepo()
    let fail!: (error:Error) => void
    repo.addAnnotation.mockImplementationOnce(() => new Promise((_,reject) => { fail = reject }))
    await setup(repo)
    await selectRange()
    await button('Anotar trecho').trigger('click')
    await wrapper.get('textarea').setValue('Rascunho')
    await wrapper.get('form').trigger('submit')
    const dialog = wrapper.get('dialog[open]')
    await dialog.trigger('cancel')
    expect(wrapper.find('dialog[open]').exists()).toBe(true)
    fail(new Error('falha'))
    await flushPromises()
    expect(dialog.get('[role=alert]').text()).toContain('Tente novamente')
    expect(dialog.get('textarea').element.value).toBe('Rascunho')
  })
  it('oferece as cores somente durante a seleção e permite grifar com um toque', async () => {
    const repo = fakeRepo()
    await setup(repo, [first, orphan])
    expect(repo.annotations).not.toHaveBeenCalled()
    expect(wrapper.find('button').exists()).toBe(false)
    await selectRange()
    await wrapper.get('button[aria-label="Grifar em azul"]').trigger('click')
    await flushPromises()
    expect(repo.addAnnotation).toHaveBeenCalledWith('tese', block.id, 3, 10, 'blue', '')
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('seleciona através de uma marcação existente e salva offsets UTF-16, cor e comentário', async () => {
    const repo = fakeRepo()
    await setup(repo)
    expect(wrapper.get('mark.blue').text()).toBe('Uma')
    await selectRange()
    await button('Anotar trecho').trigger('click')
    expect(wrapper.get('form blockquote').text()).toBe('Uma boa')
    await wrapper.get('select').setValue('green')
    await wrapper.get('textarea').setValue('Explicar')
    await wrapper.get('form').trigger('submit')
    expect(repo.addAnnotation).toHaveBeenCalledWith('tese', block.id, 3, 10, 'green', 'Explicar')
  })

  it('abre o menu acima se faltar espaço abaixo e respeita a margem direita da tela', async () => {
    await setup(fakeRepo(),[first])
    const rectangle = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function(this:Element) {
      if (this.classList.contains('selection-tools')) return new DOMRect(0,0,220,56)
      return new DOMRect(12,100,window.innerWidth-24,800)
    })
    try {
      await selectRange()
      const range = window.getSelection()!.getRangeAt(0)
      range.getBoundingClientRect = () => new DOMRect(window.innerWidth-50,window.innerHeight-42,40,24)
      document.dispatchEvent(new Event('selectionchange'))
      await flushPromises()
      const menu = wrapper.get<HTMLElement>('.selection-tools').element
      expect(Number.parseFloat(menu.style.left)+12+220).toBeLessThanOrEqual(window.innerWidth-6)
      expect(Number.parseFloat(menu.style.top)+100+56).toBeLessThan(window.innerHeight-42)
    } finally {
      rectangle.mockRestore()
    }
  })

  it('troca o menu de bloco sem replicar consultas nem controles na aula inteira', async () => {
    const repo = fakeRepo()
    await setup(repo,[first])
    const other = mount(AnnotationPanel,{attachTo:document.body,props:{
      lessonId:'tese',block:{id:'segundo',text:'Outro bloco'},repo:repo as unknown as Repository,notes:[first],
    }})
    try {
      await selectRange()
      expect(wrapper.find('.selection-tools').exists()).toBe(true)
      expect(other.find('.selection-tools').exists()).toBe(false)
      wrapper.get<HTMLButtonElement>('.selection-tools button').element.focus()
      const native = window.getSelection()!
      native.selectAllChildren(other.get('.reading-text').element)
      document.dispatchEvent(new Event('selectionchange'))
      await flushPromises()
      expect(wrapper.find('.selection-tools').exists()).toBe(false)
      expect(other.find('.selection-tools').exists()).toBe(true)
      expect(repo.annotations).not.toHaveBeenCalled()
    } finally {
      other.unmount()
    }
  })

  it('permite à lista única da aula editar uma anotação órfã sem repeti-la em cada bloco', async () => {
    const repo = fakeRepo()
    await setup(repo, [first, orphan])
    expect(wrapper.text()).not.toContain(orphan.quote)
    const panel = wrapper.vm as unknown as { edit: (note: Annotation) => void }
    panel.edit(orphan)
    await flushPromises()
    expect(wrapper.get('form blockquote').text()).toBe(orphan.quote)
    await wrapper.get('textarea').setValue('Revisada')
    await wrapper.get('form').trigger('submit')
    expect(repo.editAnnotation).toHaveBeenCalledWith(orphan.id, 'blue', 'Revisada')
  })

  it('abre um destaque por teclado e pede confirmação antes de excluir', async () => {
    const repo = fakeRepo()
    await setup(repo)
    await wrapper.get('mark[role=button]').trigger('keydown.enter')
    await button('Excluir').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(button('Manter anotação').element)
    await wrapper.get('dialog').trigger('cancel')
    expect(wrapper.find('dialog[open]').exists()).toBe(true)
    expect(document.activeElement).toBe(button('Excluir').element)
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
    expect(wrapper.find('mark').exists()).toBe(false)
  })

  it('preserva o rascunho após falha e permite repetir', async () => {
    const repo = fakeRepo()
    repo.editAnnotation.mockRejectedValueOnce(new Error('falha'))
    await setup(repo)
    await wrapper.get('mark').trigger('click')
    await wrapper.get('textarea').setValue('Guardar rascunho')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toContain('Tente novamente')
    expect(wrapper.get('textarea').element.value).toBe('Guardar rascunho')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('mantém o texto sem controles quando não há banco Android', async () => {
    await setup(null)
    expect(wrapper.get('.reading-text').text()).toBe(block.text)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
