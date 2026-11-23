<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { Catalog } from './catalog'
import type { Annotation, Repository, Review } from './db'
import { vScrollReveal } from './scrollReveal'
import AnnotationPanel from './AnnotationPanel.vue'
import InlineQuestion from './InlineQuestion.vue'
type Module = Catalog['modules'][number]
const props = defineProps<{ module:Module; questions:Catalog['questions']; repo:Repository|null; startId:string; reviews:Review[] }>()
const emit = defineEmits<{ position:[lessonId:string,blockId:string]; reinforce:[lessonId:string]; finish:[] }>()
const root = ref<HTMLElement>()
const sheet = ref<HTMLDialogElement>()
const fab = ref<HTMLButtonElement>()
const draft = ref('')
const noteSaved = ref('')
const notesLoaded = ref(false)
const drawerOpen = ref(false)
const saving = ref(false)
const error = ref('')
const answers = ref<Record<string,number>>({})
const notes = ref<Record<string,Annotation[]>>({})
const editors = new Map<string,InstanceType<typeof AnnotationPanel>>()
const lessons = computed(() => props.module.lessons)
const labels = {concept:'Conceito',example:'Exemplo',practice:'Aplicação'}
const schedule = computed(() => {
  const slots:Record<string,Catalog['questions']> = {}
  for (const lesson of lessons.value) {
    const items = props.questions.filter(q => q.lessonId === lesson.id)
    items.forEach((q,i) => {
      const blockId = q.afterBlockId ?? lesson.blocks[Math.floor(i*lesson.blocks.length/items.length)].id
      const slot = slots[blockId] ??= []
      slot.push(q)
    })
  }
  return slots
})
const currentLesson = ref(lessons.value[0].id)
let sections:HTMLElement[] = []
let frame = 0
let alive = true
let previous = props.startId
async function reloadNotes(lessonId:string) {
  if (props.repo) notes.value[lessonId] = await props.repo.annotations(lessonId)
}
async function load() {
  try {
    if (props.repo) {
      await Promise.all(lessons.value.map(l => reloadNotes(l.id)))
      answers.value = await props.repo.latestAnswers()
      draft.value = noteSaved.value = await props.repo.moduleNote(props.module.id)
    }
    notesLoaded.value = true
  } catch { error.value = 'Não foi possível carregar as notas e respostas.' }
}
function onScroll() {
  if (frame || !sections.length || drawerOpen.value) return
  frame = requestAnimationFrame(() => {
    frame = 0
    let lo=0, hi=sections.length
    while (lo < hi) {
      const mid = Math.floor((lo+hi)/2)
      if (sections[mid].getBoundingClientRect().top <= window.innerHeight*0.3) lo=mid+1
      else hi=mid
    }
    const section = sections[Math.max(0,lo-1)]
    currentLesson.value = section.dataset.lesson!
    if (previous !== section.id) {
      previous = section.id
      emit('position',currentLesson.value,section.id)
    }
  })
}
onMounted(async () => {
  await load()
  if (!alive) return
  await nextTick()
  sections = Array.from(root.value?.querySelectorAll<HTMLElement>('[data-lesson]') ?? [])
  const target = sections.find(s => s.id===props.startId)
  if (target) {
    currentLesson.value=target.dataset.lesson!
    if (target!==sections[0]) target.scrollIntoView?.({block:'start',behavior:'instant'})
  }
  window.addEventListener('scroll',onScroll,{passive:true})
})
onUnmounted(() => { alive=false; window.removeEventListener('scroll',onScroll); if (frame) cancelAnimationFrame(frame) })
async function openNotes() {
  if (!notesLoaded.value) await load()
  if (!notesLoaded.value) return
  drawerOpen.value=true
  sheet.value?.showModal()
}
async function saveNote() {
  if (saving.value) return
  saving.value=true
  try {
    if (draft.value !== noteSaved.value && props.repo) {
      await props.repo.saveModuleNote(props.module.id,draft.value)
      noteSaved.value=draft.value
    }
    sheet.value?.close()
  } catch { error.value='Não foi possível salvar sua nota. Tente novamente.' }
  finally { saving.value=false }
}
function editFromSheet(a:Annotation) {
  if (draft.value !== noteSaved.value) { error.value='Salve sua nota geral antes de editar uma marcação.'; return }
  const owner = lessons.value.find(l => l.id===a.lessonId)
  const blockId = owner?.blocks.some(b=>b.id===a.blockId) ? a.blockId : owner?.blocks[0].id
  if (!blockId) return
  sheet.value?.close()
  document.getElementById(blockId)?.scrollIntoView?.({block:'center'})
  editors.get(blockId)?.edit(a)
}
</script>
<template>
  <article ref="root" class="reader">
    <header class="chapter"><span class="meta">Módulo {{ module.order }}</span><h1>{{ module.title }}</h1></header>
    <p v-if="error && !drawerOpen" role="alert">{{ error }}</p>
    <section v-for="lesson in lessons" :key="lesson.id" class="lesson">
      <h2 v-if="lesson.title!==module.title">{{ lesson.title }}</h2>
      <div v-for="block in lesson.blocks" v-scroll-reveal :id="block.id" :key="block.id" :data-lesson="lesson.id" class="passage">
        <div :class="['prose',block.kind]"><small>{{ labels[block.kind] }}</small>
          <AnnotationPanel :ref="el=>{ if(el) editors.set(block.id,el as InstanceType<typeof AnnotationPanel>); else editors.delete(block.id) }" :lesson-id="lesson.id" :block="block" :repo="repo" :notes="notes[lesson.id] ?? []" @changed="reloadNotes(lesson.id)" />
        </div>
        <template v-if="notesLoaded"><InlineQuestion v-for="q in schedule[block.id]" :key="q.id" :question="q" :repo="repo" :initial="answers[q.id]" /></template>
      </div>
      <button v-if="repo" :disabled="reviews.some(r=>r.lessonId===lesson.id)" @click="emit('reinforce',lesson.id)">{{ reviews.some(r=>r.lessonId===lesson.id) ? 'Marcada para reforço' : 'Marcar para reforço' }}</button>
    </section>
    <button v-if="repo" class="primary" @click="emit('finish')">Concluir módulo</button>
    <button v-if="repo" ref="fab" class="notes-fab" aria-label="Notas do módulo" @click="openNotes">
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M15 3H5v18h14V10M10 14l1-4 8-8 3 3-8 8-4 1Z"/></svg>
    </button>
    <dialog ref="sheet" class="sheet" aria-labelledby="sheet-title" @cancel.prevent="saveNote" @close="drawerOpen=false;fab?.focus({preventScroll:true})">
      <h2 id="sheet-title">Notas do módulo</h2><label class="field">Nota geral<textarea v-model="draft" maxlength="32000" rows="6" :disabled="saving"/></label>
      <button class="primary" :disabled="saving" @click="saveNote">Salvar e voltar</button>
      <p v-if="error" role="alert">{{ error }}</p>
      <section v-if="Object.values(notes).flat().length"><h3>Trechos marcados</h3>
        <button v-for="a in Object.values(notes).flat()" :key="a.id" class="note-row" @click="editFromSheet(a)">
          <q>{{ a.quote }}</q><small>{{ a.note }}</small><small v-if="a.start===null">Trecho sem correspondência na versão atual</small>
        </button>
      </section>
    </dialog>
  </article>
</template>
