<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { buildPrivateCatalog, groupPrivateFiles, type PrivateCatalog } from './privateCatalog'

const props = defineProps<{ onImport: (catalog: PrivateCatalog) => Promise<void> }>()
const files = shallowRef<File[]>([])
const preview = shallowRef<PrivateCatalog | null>(null)
const busy = ref(false)
const message = ref('')
const error = ref('')
const missing = computed(() => {
  if (!files.value.length) return []
  return [...groupPrivateFiles(files.value)].flatMap(([n, p]) => !p.lesson ? ['modulo' + n + '.json'] :
    !p.quiz ? ['modulo' + n + '_quiz.json'] : [])
})

function select(event: Event) {
  const input = event.target as HTMLInputElement
  const incoming = Array.from(input.files ?? [])
  input.value = ''
  if (!incoming.length) return
  error.value = ''
  message.value = ''
  preview.value = null
  try {
    const combined = [...files.value, ...incoming]
    groupPrivateFiles(combined)
    files.value = combined
  } catch (e) { error.value = (e as Error).message }
}
function clear() {
  files.value = []
  preview.value = null
  error.value = ''
  message.value = ''
}
async function inspect() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try { preview.value = await buildPrivateCatalog(files.value) }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function commit() {
  if (!preview.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await props.onImport(preview.value)
    clear()
    message.value = 'Referências importadas neste dispositivo.'
  } catch { error.value = 'Não foi possível concluir a importação. Confira o catálogo instalado e tente novamente.' }
  finally { busy.value = false }
}
</script>

<template>
  <section aria-label="Importar referências privadas">
    <h2>Importar referências privadas</h2>
    <p>Escolha os arquivos de conversa e quiz que você tem autorização para usar. É possível selecionar uma pasta de cada vez. A importação é local.</p>
    <label>Adicionar arquivos JSON
      <input type="file" accept=".json,application/json" multiple :disabled="busy" @change="select">
    </label>
    <p v-if="files.length">{{ files.length }} arquivo(s) selecionado(s).</p>
    <p v-if="missing.length">Falta selecionar {{ missing.join(', ') }}.</p>
    <button v-if="files.length" type="button" :disabled="busy" @click="clear">Limpar seleção</button>
    <button v-if="files.length && !preview" type="button" :disabled="busy || !!missing.length" @click="inspect">Conferir importação</button>
    <div v-if="preview">
      <h3>Prévia da importação</h3>
      <p>{{ preview.modules.length }} módulo(s), {{ preview.modules.reduce((n, m) => n + m.lessons.length, 0) }} aula(s) e {{ preview.questions.length }} questão(ões).</p>
      <ul><li v-for="m in preview.modules" :key="m.id">{{ m.title }}</li></ul>
      <button type="button" :disabled="busy" @click="commit">Confirmar importação</button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
