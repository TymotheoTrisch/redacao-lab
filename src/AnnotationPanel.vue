<script lang="ts">
// Um observador para todo o leitor, com entrega ao bloco atual e ao anterior.
let subscribers = 0
let lastParagraph: Element | null = null
function notifySelection() {
  const selection = window.getSelection()
  const node = selection?.anchorNode
  const element = node?.nodeType === Node.ELEMENT_NODE ? node as Element : node?.parentElement
  const current = selection && !selection.isCollapsed ? element?.closest('[data-note-paragraph]') ?? null : null
  if (lastParagraph && lastParagraph !== current) lastParagraph.dispatchEvent(new Event('rangechange'))
  lastParagraph = current
  current?.dispatchEvent(new Event('rangechange'))
}
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Annotation, Color, Repository } from './db'

const props = defineProps<{
  lessonId: string
  block: { id: string; text: string }
  repo: Repository | null
  notes?: Annotation[]
}>()
const emit = defineEmits<{ changed: [] }>()
const colors: Record<Color, string> = { yellow: 'amarelo', blue: 'azul', green: 'verde' }
const paragraph = ref<HTMLElement>()
const container = ref<HTMLElement>()
const toolbar = ref<HTMLElement>()
const editorHeading = ref<HTMLElement>()
const returnFocus = ref<HTMLElement>()
const localNotes = ref<Annotation[]>([])
const selection = ref<{ start:number; end:number } | null>(null)
const position = ref({ left: 0, top: 0 })
type Draft = { id:string|null; start:number; end:number; quote:string; color:Color; note:string }
const draft = ref<Draft | null>(null)
const deleting = ref(false)
const busy = ref(false)
const error = ref('')
const loadFailed = ref(false)
let request = 0

async function reload() {
  const current = ++request
  loadFailed.value = false
  if (props.notes !== undefined || !props.repo) return
  try {
    const rows = await props.repo.annotations(props.lessonId)
    if (current === request) localNotes.value = rows
  } catch {
    if (current === request) loadFailed.value = true
  }
}
watch([() => props.lessonId, () => props.repo, () => props.notes === undefined], () => {
  localNotes.value = []
  void reload()
}, { immediate:true })
watch([() => props.lessonId, () => props.block.id, () => props.block.text, () => props.repo], () => {
  selection.value = draft.value = null
  deleting.value = false
  error.value = ''
})

const segments = computed(() => {
  const content = props.block.text
  const anchors = (props.notes ?? localNotes.value).filter((a): a is Annotation & { start:number; end:number } =>
    a.lessonId === props.lessonId && a.blockId === props.block.id && a.start !== null && a.end !== null &&
    content.slice(a.start, a.end) === a.quote)
  const edges = [...new Set([0, content.length, ...anchors.flatMap(a => [a.start,a.end])])].sort((a,b) => a-b)
  return edges.slice(1).map((end,i) => {
    const start = edges[i]
    const active = anchors.filter(a => a.start <= start && a.end >= end)
    return { start, text:content.slice(start,end), annotation:active.at(-1) }
  })
})

function placeToolbar() {
  const root = container.value
  const menu = toolbar.value
  const native = window.getSelection()
  if (!root || !menu || !native?.rangeCount) return
  const range = native.getRangeAt(0)
  // Os retângulos de seleção do WebView são relativos à viewport.
  if (typeof range.getBoundingClientRect !== 'function') return
  const rect = range.getBoundingClientRect()
  const frame = root.getBoundingClientRect()
  const box = menu.getBoundingClientRect()
  const viewport = window.visualViewport
  const top = viewport?.offsetTop ?? 0
  const bottom = top + (viewport?.height ?? window.innerHeight)
  const left = viewport?.offsetLeft ?? 0
  const right = left + (viewport?.width ?? window.innerWidth)
  const x = rect.left + (rect.width - box.width) / 2
  const y = rect.bottom + 22
  position.value = {
    left: Math.max(left+6, Math.min(x, right-box.width-6)) - frame.left,
    top: (y + box.height <= bottom-6 ? y : Math.max(top+6,rect.top-box.height-10)) - frame.top,
  }
}

function readSelection() {
  const root = paragraph.value
  const native = window.getSelection()
  const range = native?.rangeCount ? native.getRangeAt(0) : null
  if (!props.repo || draft.value || !root || !range || range.collapsed ||
    !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    const usingMenuByKeyboard = (!range || range.collapsed) && toolbar.value?.contains(document.activeElement)
    if (!usingMenuByKeyboard) selection.value = null
    return
  }
  const before = range.cloneRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer,range.startOffset)
  const start = before.toString().length
  selection.value = { start, end:start + range.toString().length }
  void nextTick(placeToolbar)
}

onMounted(() => {
  if (++subscribers === 1) document.addEventListener('selectionchange', notifySelection)
})
onUnmounted(() => {
  if (lastParagraph === paragraph.value || !lastParagraph?.isConnected) lastParagraph = null
  if (--subscribers === 0) {
    document.removeEventListener('selectionchange', notifySelection)
    lastParagraph = null
  }
})
watch(() => !!selection.value, (visible, _, onCleanup) => {
  if (!visible) return
  window.addEventListener('resize', placeToolbar)
  window.visualViewport?.addEventListener('resize',placeToolbar)
  onCleanup(() => {
    window.removeEventListener('resize',placeToolbar)
    window.visualViewport?.removeEventListener('resize',placeToolbar)
  })
})

function clearSelection() {
  selection.value = null
  const native = window.getSelection()
  if (native?.anchorNode && paragraph.value?.contains(native.anchorNode)) native.removeAllRanges()
}
function windowSelectionActive() {
  const selected = window.getSelection()
  return !!selected && !selected.isCollapsed && paragraph.value?.contains(selected.anchorNode)
}
function extendSelection(event:KeyboardEvent) {
  if (!props.repo || !event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
  const root = paragraph.value
  const selected = window.getSelection()
  if (!root || !selected || typeof selected.modify !== 'function') return
  event.preventDefault()
  if (!root.contains(selected.anchorNode)) {
    selected.selectAllChildren(root)
    if (event.key === 'ArrowLeft') selected.collapseToEnd()
    else selected.collapseToStart()
  }
  const previous = selected.rangeCount ? selected.getRangeAt(0).cloneRange() : null
  selected.modify('extend', event.key === 'ArrowLeft' ? 'backward' : 'forward', event.ctrlKey ? 'word' : 'character')
  if (previous && !root.contains(selected.focusNode)) {
    selected.removeAllRanges()
    selected.addRange(previous)
  }
  readSelection()
}
function openEditor(item:Draft) {
  returnFocus.value = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
  error.value = ''
  deleting.value = false
  draft.value = item
  clearSelection()
  void nextTick(() => editorHeading.value?.focus())
}
function createDraft() {
  if (!selection.value) return
  const {start,end} = selection.value
  openEditor({id:null,start,end,quote:props.block.text.slice(start,end),color:'yellow',note:''})
}
function edit(a:Annotation) {
  if (!props.repo || a.lessonId !== props.lessonId) return
  openEditor({id:a.id,start:a.start ?? 0,end:a.end ?? 0,quote:a.quote,color:a.color,note:a.note})
}
defineExpose({edit})
function closeEditor() {
  draft.value = null
  deleting.value = false
  error.value = ''
  const target = returnFocus.value?.isConnected && returnFocus.value !== document.body ? returnFocus.value : paragraph.value
  target?.focus({preventScroll:true})
}
async function change(operation:(repo:Repository) => Promise<unknown>) {
  const repo = props.repo
  if (!repo || busy.value) return
  const lessonId = props.lessonId
  const blockId = props.block.id
  busy.value = true
  error.value = ''
  try {
    await operation(repo)
    if (lessonId === props.lessonId && repo === props.repo) {
      if (blockId === props.block.id) {
        clearSelection()
        if (draft.value) closeEditor()
      }
      emit('changed')
      if (props.notes === undefined) await reload()
    }
  } catch {
    if (lessonId === props.lessonId) error.value = 'Não foi possível concluir a alteração. Tente novamente.'
  } finally {
    busy.value = false
  }
}
function highlight(color:Color) {
  if (!selection.value) return
  const {start,end} = selection.value
  return change(repo => repo.addAnnotation(props.lessonId,props.block.id,start,end,color,''))
}
function save() {
  const item = draft.value
  if (!item) return
  return change(repo => item.id === null
    ? repo.addAnnotation(props.lessonId,props.block.id,item.start,item.end,item.color,item.note)
    : repo.editAnnotation(item.id,item.color,item.note))
}
function remove() {
  const id = draft.value?.id
  if (id) return change(repo => repo.deleteAnnotation(id))
}
</script>

<template>
  <div ref="container" class="annotations">
    <p ref="paragraph" :tabindex="repo ? 0 : -1" data-note-paragraph class="reading-text" @rangechange="readSelection"
      aria-keyshortcuts="Shift+ArrowLeft Shift+ArrowRight" @keydown="extendSelection"
      @pointerup="readSelection" @keyup="readSelection"><template v-for="s in segments" :key="s.start"><mark
        v-if="s.annotation" :class="s.annotation.color" role="button" tabindex="0"
        :aria-label="s.text + '. Editar destaque' + (s.annotation.note ? '. ' + s.annotation.note : '')"
        @click="!windowSelectionActive() && edit(s.annotation)" @keydown.enter.prevent="edit(s.annotation)"
        @keydown.space.prevent="edit(s.annotation)">{{ s.text }}</mark><span v-else>{{ s.text }}</span></template></p>
    <div v-if="selection && !draft" ref="toolbar" class="selection-tools" role="group" aria-label="Marcar trecho selecionado"
      :style="{left:position.left+'px',top:position.top+'px'}" @keydown.esc="clearSelection">
      <button v-for="(name,key) in colors" :key="key" type="button" class="swatch" :class="key"
        :aria-label="'Grifar em '+name" :title="'Grifar em '+name" :disabled="busy" @pointerdown.prevent @click="highlight(key)">
        <span aria-hidden="true" />
      </button>
      <button type="button" :disabled="busy" @pointerdown.prevent @click="createDraft">Anotar trecho</button>
    </div>
    <form v-if="draft" class="note-editor" @submit.prevent="save" @keydown.esc.prevent="!busy && closeEditor()">
      <h3 ref="editorHeading" tabindex="-1">{{ draft.id ? 'Editar anotação' : 'Nova anotação' }}</h3>
      <blockquote>{{ draft.quote }}</blockquote>
      <label>Cor da marcação<select v-model="draft.color"><option v-for="(name,key) in colors" :key="key" :value="key">{{ name }}</option></select></label>
      <label>Comentário (opcional)<textarea v-model="draft.note" maxlength="4000" rows="3" /></label>
      <div v-if="deleting" class="editor-actions">
        <p role="status">Excluir esta anotação?</p>
        <button type="button" :disabled="busy" @click="remove">Confirmar exclusão</button>
        <button type="button" :disabled="busy" @click="deleting=false">Manter anotação</button>
      </div>
      <div v-else class="editor-actions">
        <button type="submit" :disabled="busy">Salvar anotação</button>
        <button type="button" :disabled="busy" @click="closeEditor">Cancelar</button>
        <button v-if="draft.id" type="button" :disabled="busy" @click="deleting=true">Excluir</button>
      </div>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loadFailed" role="alert">Não foi possível carregar as anotações.
      <button type="button" @click="reload">Tentar novamente</button>
    </p>
  </div>
</template>

<style scoped>
.annotations { position:relative; }
.reading-text { white-space:pre-wrap; overflow-wrap:anywhere; user-select:text; -webkit-user-select:text; }
mark { color:#182322; cursor:pointer; border-radius:.15em; }
mark.yellow, .swatch.yellow span { background:#ffe787; }
mark.blue, .swatch.blue span { background:#a5d8ff; }
mark.green, .swatch.green span { background:#ade6b8; }
.selection-tools { position:absolute; z-index:6; display:flex; align-items:center; flex-wrap:wrap; gap:2px;
  max-width:calc(100vw - 12px); width:max-content; padding:4px; border:1px solid var(--line,#aab8b2);
  border-radius:12px; background:var(--surface,#fff); color:var(--ink,#182322); box-shadow:0 4px 16px #1113; }
.selection-tools button { min-height:44px; border:0; padding:0 .6rem; background:transparent; color:inherit; }
.selection-tools .swatch { display:grid; place-items:center; width:44px; padding:0; }
.swatch span { display:block; width:23px; height:23px; border-radius:50%; border:1px solid #424838; }
.note-editor { margin:1rem 0; padding:1rem; border:1px solid var(--line,#aab8b2); border-radius:12px; background:var(--surface,#fff); }
.note-editor h3 { margin:0; }
.note-editor blockquote { margin:.6rem 0; padding-inline-start:.85rem; border-inline-start:3px solid var(--accent,#48725f); overflow-wrap:anywhere; }
.note-editor label, .note-editor select, .note-editor textarea { display:block; }
.note-editor label { margin-block:.7rem; }
.note-editor textarea { width:100%; box-sizing:border-box; }
.editor-actions { display:flex; flex-wrap:wrap; gap:.45rem; }
.editor-actions p { flex-basis:100%; margin:0; }
</style>
