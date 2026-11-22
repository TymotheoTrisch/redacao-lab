<script setup lang="ts">
import { ref } from 'vue'
import type { Catalog } from './catalog'
import type { Repository } from './db'
const props = defineProps<{ question:Catalog['questions'][number]; initial?:number; repo:Repository|null }>()
const choice = ref<number|undefined>(props.initial)
const saved = ref<number|undefined>(props.initial)
const busy = ref(false)
const issue = ref('')
async function check() {
  const selected = choice.value
  if (selected === undefined || busy.value) return
  busy.value = true
  issue.value = ''
  try {
    if (props.repo) await props.repo.answer(props.question,selected)
    saved.value = selected
  } catch { issue.value = 'A resposta não foi gravada. Tente de novo.' }
  finally { busy.value = false }
}
</script>
<template>
  <form class="question" @submit.prevent="check">
    <fieldset :disabled="busy || saved !== undefined">
      <legend>{{ question.prompt }}</legend>
      <label v-for="(option,i) in question.options" :key="i" class="option" :class="{chosen:choice===i}">
        <input type="radio" :name="question.id" :checked="choice===i" @change="choice=i"> {{ option }}
      </label>
    </fieldset>
    <button v-if="saved === undefined" class="primary" :disabled="busy || choice===undefined">Conferir resposta</button>
    <div v-else class="feedback" role="status"><strong>{{ saved===question.answer ? 'Você acertou.' : 'Resposta correta: ' + question.options[question.answer] }}</strong>
      <p>{{ question.explanation }}</p><button type="button" @click="choice=undefined;saved=undefined">Tentar de novo</button></div>
    <p v-if="issue" role="alert">{{ issue }}</p>
  </form>
</template>
