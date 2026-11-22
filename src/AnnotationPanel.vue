<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Annotation, Color, Repository } from './db'

const props = defineProps<{ lessonId: string; block: { id: string; text: string }; repo: Repository | null }>()
const colors: Record<Color, string> = { yellow: 'Amarelo', blue: 'Azul', green: 'Verde' }
const paragraph = ref<HTMLElement | null>(null)
const notes = ref<Annotation[]>([])
const selection = ref<{ start: number; end: number } | null>(null)
type Draft = { id: string | null; start: number; end: number; quote: string; color: Color; note: string }
const draft = ref<Draft | null>(null)
const deleting = ref<string | null>(null)
const busy = ref(false)
const error = ref('')
const loadFailed = ref(false)
let request = 0

async function reload() {
  const current = ++request
  loadFailed.value = false
  error.value = ''
  try {
    const rows = props.repo ? await props.repo.annotations(props.lessonId) : []
    if (current === request) notes.value = rows
  } catch {
    if (current === request) {
      loadFailed.value = true
      error.value = 'Não foi possível carregar as anotações.'
    }
  }
}

watch([() => props.lessonId, () => props.repo], () => {
  notes.value = []
  void reload()
}, { immediate: true })
watch([() => props.lessonId, () => props.block.id, () => props.block.text, () => props.repo], () => {
  selection.value = null
  draft.value = null
  deleting.value = null
})

const segments = computed(() => {
  const content = props.block.text
  const anchors = notes.value.filter((a): a is Annotation & { start: number; end: number } =>
    a.blockId === props.block.id && a.start !== null && a.end !== null && content.slice(a.start, a.end) === a.quote)
  const edges = [...new Set([0, content.length, ...anchors.flatMap(a => [a.start, a.end])])].sort((a,b) => a-b)
  return edges.slice(1).map((end,i) => {
    const start = edges[i]
    const active = anchors.filter(a => a.start <= start && a.end >= end)
    return { start, text: content.slice(start, end), color: active[active.length - 1]?.color }
  })
})

function readSelection() {
  const root = paragraph.value
  const native = window.getSelection()
  const range = native?.rangeCount ? native.getRangeAt(0) : null
  if (!root || !range || range.collapsed || !root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    selection.value = null
    return
  }
  const before = range.cloneRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length
  selection.value = { start, end: start + range.toString().length }
}
onMounted(() => document.addEventListener('selectionchange', readSelection))
onUnmounted(() => document.removeEventListener('selectionchange', readSelection))

function createDraft() {
  if (!selection.value) return
  const { start, end } = selection.value
  draft.value = { id: null, start, end, quote: props.block.text.slice(start, end), color: 'yellow', note: '' }
  deleting.value = null
}
function edit(a: Annotation) {
  draft.value = { id: a.id, start: 0, end: 0, quote: a.quote, color: a.color, note: a.note }
  deleting.value = null
}
async function change(operation: (repo: Repository) => Promise<unknown>) {
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
        draft.value = null
        deleting.value = null
        selection.value = null
      }
      await reload()
    }
  } catch {
    if (lessonId === props.lessonId) error.value = 'Não foi possível concluir a alteração. Tente novamente.'
  } finally {
    busy.value = false
  }
}
function save() {
  const item = draft.value
  if (!item) return
  return change(repo => item.id === null
    ? repo.addAnnotation(props.lessonId, props.block.id, item.start, item.end, item.color, item.note)
    : repo.editAnnotation(item.id, item.color, item.note))
}
</script>

<template>
  <div class="annotations">
    <p ref="paragraph" class="reading-text" @pointerup="readSelection" @keyup="readSelection"><component
      :is="s.color ? 'mark' : 'span'" v-for="s in segments" :key="s.start" :class="s.color"
    >{{ s.text }}</component></p>
    <section v-if="repo" aria-label="Anotações da aula">
      <p v-if="!draft">Selecione um trecho do texto para marcar ou comentar.</p>
      <button v-if="!draft" type="button" :disabled="!selection || busy" @mousedown.prevent @click="createDraft">Anotar trecho</button>
      <form v-if="draft" @submit.prevent="save">
        <h3>{{ draft.id ? 'Editar anotação' : 'Nova anotação' }}</h3>
        <blockquote>{{ draft.quote }}</blockquote>
        <label>Cor da marcação
          <select v-model="draft.color"><option v-for="(name, key) in colors" :key="key" :value="key">{{ name }}</option></select>
        </label>
        <label>Comentário (opcional)<textarea v-model="draft.note" maxlength="4000" rows="3" /></label>
        <button type="submit" :disabled="busy">Salvar anotação</button>
        <button type="button" :disabled="busy" @click="draft = null">Cancelar</button>
      </form>
      <p v-if="error" role="alert">{{ error }}</p>
      <button v-if="loadFailed" type="button" @click="reload">Recarregar anotações</button>
      <h3>Anotações da aula</h3>
      <p v-if="!notes.length && !loadFailed">Nenhuma anotação nesta aula.</p>
      <ul v-else>
        <li v-for="a in notes" :key="a.id">
          <blockquote>{{ a.quote }}</blockquote>
          <span>{{ colors[a.color] }}</span>
          <small v-if="a.start === null">Trecho sem correspondência na versão atual.</small>
          <p v-if="a.note">{{ a.note }}</p>
          <template v-if="deleting === a.id">
            <p>Excluir esta anotação?</p>
            <button type="button" :disabled="busy" @click="change(repo => repo.deleteAnnotation(a.id))">Confirmar exclusão</button>
            <button type="button" :disabled="busy" @click="deleting = null">Manter anotação</button>
          </template>
          <template v-else>
            <button type="button" :disabled="busy || !!draft" @click="edit(a)">Editar</button>
            <button type="button" :disabled="busy || !!draft" @click="deleting = a.id">Excluir</button>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.reading-text { white-space: pre-wrap; overflow-wrap: anywhere; user-select: text; -webkit-user-select: text; }
mark { color: #171919; }
mark.yellow { background: #ffe787; }
mark.blue { background: #a5d8ff; }
mark.green { background: #ade6b8; }
form label, form select, form textarea, li small { display: block; }
form label { margin-block: .7rem; }
form textarea { width: 100%; box-sizing: border-box; }
blockquote { margin-inline: 0; padding-inline-start: .85rem; border-inline-start: 3px solid currentColor; overflow-wrap: anywhere; }
ul { list-style: none; padding-inline-start: 0; }
li { margin-block: 1rem; overflow-wrap: anywhere; }
button { min-height: 44px; margin-inline-end: .4rem; }
</style>
