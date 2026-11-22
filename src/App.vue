<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { Capacitor } from '@capacitor/core'
import { openRepository, type Preferences, type Progress, type Repository, type Review } from './db'
import { lessons, searchModules, useNavigation, type Lesson } from './navigation'
import { catalog } from './catalog'
const catalogQuestions = catalog.questions
import AnnotationPanel from './AnnotationPanel.vue'

const nav = useNavigation()
const native = Capacitor.getPlatform() === 'android'
const repo = shallowRef<Repository | null>(null)
const busy = ref(false)
const error = ref('')
const message = ref('')
const progress = ref<Progress[]>([])
const reviews = ref<Review[]>([])
const prefs = ref<Preferences>({ examDate: '', minutes: 30, days: [1,2,3,4,5], theme: 'system' })
const lesson = ref<Lesson>(lessons[0])
const page = ref(0)
const block = computed(() => lesson.value.blocks[page.value])
const modules = computed(() => searchModules(nav.query))
const latest = computed(() => lessons.find(l => l.id === progress.value[0]?.lessonId))
const name = (id: string) => lessons.find(l => l.id === id)?.title ?? id
const status = (id: string) => progress.value.find(p => p.lessonId === id)?.status
const kind = {concept: 'Conceito', example: 'Exemplo', practice: 'Prática'}
const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

async function action(work: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = message.value = ''
  try { await work() } catch { error.value = 'Não foi possível concluir a operação. Confira os dados e tente novamente.' }
  finally { busy.value = false }
}
function initialize() {
  return action(async () => {
    if (!native) return
    const db = await openRepository()
    const settings = await db.preferences()
    progress.value = await db.progress()
    reviews.value = await db.reviews()
    prefs.value = settings
    document.documentElement.dataset.theme = settings.theme
    repo.value = db
  })
}
onMounted(initialize)
function go(screen: typeof nav.screen) {
  nav.screen = screen
  error.value = message.value = ''
  window.scrollTo(0, 0)
}
async function read(item: Lesson, index?: number) {
  await action(async () => {
    const last = progress.value.find(p => p.lessonId === item.id)
    const next = index ?? Math.max(0, item.blocks.findIndex(b => b.id === last?.blockId))
    if (repo.value) {
      await repo.value.saveProgress(item.id, item.blocks[next].id)
      progress.value = await repo.value.progress()
    }
    lesson.value = item
    page.value = next
    go('reader')
  })
}
function complete() {
  return action(async () => {
    const db = repo.value!
    await db.saveProgress(lesson.value.id, block.value.id, 'done')
    progress.value = await db.progress()
    go('library')
    message.value = 'Aula concluída.'
  })
}
function updateReview(work: (db: Repository) => Promise<unknown>, feedback: string) {
  return action(async () => {
    await work(repo.value!)
    reviews.value = await repo.value!.reviews()
    message.value = feedback
  })
}
function saveSettings() {
  return action(async () => {
    await repo.value!.savePreferences(prefs.value)
    document.documentElement.dataset.theme = prefs.value.theme
    message.value = 'Preferências salvas.'
  })
}
</script>

<template>
  <header class="mast"><span class="brand">Redação <i>Lab</i></span><span>Estudo pessoal</span></header>
  <nav aria-label="Navegação principal">
    <button v-for="tab in (['library','review','settings'] as const)" :key="tab" :disabled="busy || (native && !repo)"
      :aria-current="(nav.screen === tab || (tab === 'library' && nav.screen === 'reader')) ? 'page' : undefined" @click="go(tab)">
      {{ {library:'Biblioteca',review:'Reforço',settings:'Preferências'}[tab] }}
    </button>
  </nav>
  <main>
    <p v-if="error" role="alert" class="alert">{{ error }}</p>
    <p v-if="message" role="status" class="notice">{{ message }}</p>
    <template v-if="native && !repo">
      <p>{{ busy ? 'Abrindo o caderno de estudos…' : 'O banco de estudos está indisponível.' }}</p>
      <button v-if="!busy" @click="initialize">Tentar novamente</button>
    </template>
    <template v-else>
      <p v-if="!native" class="notice">Prévia de leitura. No Android, o SQLite guarda seu progresso e suas anotações.</p>
      <template v-if="nav.screen === 'library'">
        <h1>Biblioteca</h1>
        <button v-if="latest" class="resume" :disabled="busy" @click="read(latest)">Retomar leitura · {{ latest.title }} →</button>
        <label class="field">Buscar nas aulas<input v-model="nav.query" type="search" placeholder="Tema, título ou trecho"></label>
        <p v-if="!modules.length">Nenhuma aula encontrada.</p>
        <section v-for="module in modules" :key="module.id" class="module">
          <h2>{{ module.title }}</h2>
          <button v-for="item in module.lessons" :key="item.id" class="row" :disabled="busy" @click="read(item)">
            <span>{{ item.title }} <small>{{ status(item.id) === 'done' ? 'Concluída' : status(item.id) === 'reading' ? 'Em leitura' : '' }}</small></span><span aria-hidden="true">→</span>
          </button>
        </section>
      </template>
      <template v-else-if="nav.screen === 'reader'">
        <button class="link" :disabled="busy" @click="go('library')">← Biblioteca</button>
        <h1>{{ lesson.title }}</h1>
        <p class="meta">{{ kind[block.kind] }} · Bloco {{ page + 1 }} de {{ lesson.blocks.length }}</p>
        <AnnotationPanel :lesson-id="lesson.id" :block="block" :repo="repo" />
        <div class="actions">
          <button :disabled="busy || page === 0" @click="read(lesson,page-1)">Anterior</button>
          <button v-if="page+1 < lesson.blocks.length" class="primary" :disabled="busy" @click="read(lesson,page+1)">Próximo bloco</button>
          <button v-else-if="repo" class="primary" :disabled="busy" @click="complete">Concluir aula</button>
        </div>
        <button v-if="repo" :disabled="busy || reviews.some(r => r.lessonId === lesson.id)" @click="updateReview(db => db.markReview(lesson.id), 'Aula marcada para reforço.')">
          {{ reviews.some(r => r.lessonId === lesson.id) ? 'Marcada para reforço' : 'Marcar para reforço' }}
        </button>
        <details class="practice"><summary>Exercícios da aula</summary>
          <article v-for="q in catalogQuestions.filter(q => q.lessonId === lesson.id)" :key="q.id">
            <h3>{{ q.prompt }}</h3><ol type="A"><li v-for="option in q.options" :key="option">{{ option }}</li></ol>
            <details><summary>Conferir resposta</summary><p>{{ q.options[q.answer] }}. {{ q.explanation }}</p></details>
          </article>
        </details>
      </template>
      <template v-else-if="nav.screen === 'review'">
        <h1>Reforço</h1>
        <p v-if="!reviews.length">As aulas que você marcar para reforço aparecerão aqui com a data da próxima revisão.</p>
        <section v-for="r in reviews" :key="r.id" class="module">
          <h2>{{ name(r.lessonId) }}</h2><p>Revisar em {{ r.dueDate.split('-').reverse().join('/') }}</p>
          <div class="actions">
            <button :disabled="busy" @click="read(lessons.find(l => l.id === r.lessonId)!)">Reler</button>
            <button :disabled="busy" @click="updateReview(db => db.review(r.id,true),'Revisão registrada.')">Lembrei</button>
            <button :disabled="busy" @click="updateReview(db => db.review(r.id,false),'Revisão reagendada.')">Preciso praticar</button>
          </div>
        </section>
      </template>
      <template v-else>
        <h1>Preferências</h1>
        <form @submit.prevent="saveSettings"><fieldset :disabled="!repo || busy">
          <label class="field">Data da prova<input v-model="prefs.examDate" type="date"></label>
          <label class="field">Minutos de estudo por dia<input v-model.number="prefs.minutes" type="number" min="1" max="1440" required></label>
          <fieldset><legend>Dias disponíveis</legend><label v-for="(day,i) in weekdays" :key="day" class="day"><input v-model="prefs.days" type="checkbox" :value="i">{{ day }}</label></fieldset>
          <label class="field">Aparência<select v-model="prefs.theme"><option value="system">Seguir o sistema</option><option value="light">Clara</option><option value="dark">Escura</option></select></label>
          <button class="primary" :disabled="!prefs.days.length">Salvar preferências</button>
        </fieldset></form>
      </template>
    </template>
  </main>
</template>

