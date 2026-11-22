import { z } from 'zod'
import { catalogSchema } from './catalog'

export const privateCatalogSchema = catalogSchema.superRefine((data, ctx) => {
  const entities = [...data.sources, ...data.competencies, ...data.modules, ...data.questions,
    ...data.modules.flatMap(m => m.lessons.flatMap(l => [l, ...l.blocks]))]
  if (entities.some(item => !item.id.startsWith('pr-')) || data.sources.some(item => item.origin !== 'private-import')) {
    ctx.addIssue({ code: 'custom', message: 'O catálogo privado tem identificadores ou origem incompatíveis.' })
  }
  const anchors = new Map(data.modules.flatMap(m => m.lessons.map(l => [l.id, new Set(l.blocks.map(b => b.id))] as const)))
  for (const item of data.questions) {
    if (!item.afterBlockId || !anchors.get(item.lessonId)?.has(item.afterBlockId)) {
      ctx.addIssue({ code: 'custom', message: 'Questão sem trecho correspondente.' })
    }
  }
})
export type PrivateCatalog = z.infer<typeof privateCatalogSchema>
export type PrivateFile = Pick<File, 'name' | 'size' | 'text'>

const string = z.string().trim().min(1).max(4000)
const integer = z.number().int().nonnegative().max(99999999)
const speech = z.object({ character: string, message: string, emoji: z.string().max(80).optional() }).strict()
const dialogueTurn = speech.extend({ message: z.string().trim().max(4000) }).refine(turn => turn.message || turn.emoji?.trim())
const conversation = z.object({
  messages: z.array(z.object({ id: integer, type: z.literal('conversation'), sequence: z.array(dialogueTurn).min(1).max(100) }).strict()).min(1).max(500),
}).strict()
const feedback = { type: z.literal('quiz'), question: string, explanation: string, feedbackCorrect: speech, feedbackWrong: speech }
const quiz = z.object({ moduleId: integer, title: string, items: z.array(z.union([
  z.object({ type: z.literal('conversation'), character: string, message: string }).strict(),
  z.object({ ...feedback, questionType: z.enum(['multiple-choice', 'true-false']),
    options: z.array(z.object({ text: string, correct: z.boolean() }).strict()).min(2).max(8) }).strict(),
  z.object({ ...feedback, questionType: z.literal('matching'),
    pairs: z.array(z.object({ left: string, right: string }).strict()).min(2).max(8) }).strict(),
])).min(1).max(500) }).strict()

export function groupPrivateFiles(files: readonly PrivateFile[]) {
  if (!files.length || files.length > 30) throw new Error('Selecione até 30 arquivos de conversa e quiz.')
  const pairs = new Map<number, { lesson?: PrivateFile; quiz?: PrivateFile }>()
  let size = 0
  for (const file of files) {
    const match = /^modulo([1-9]|1[0-5])(_quiz)?\.json$/i.exec(file.name)
    if (!match) throw new Error('Escolha apenas arquivos moduloN.json e moduloN_quiz.json, com N de 1 a 15.')
    size += file.size
    if (file.size > 1024 * 1024 || size > 8 * 1024 * 1024) throw new Error('Limite de 1 MB por arquivo e 8 MB no conjunto.')
    const n = Number(match[1])
    const kind = match[2] ? 'quiz' : 'lesson'
    const pair = pairs.get(n) ?? {}
    if (pair[kind]) throw new Error('Há dois arquivos do mesmo tipo para um módulo.')
    pair[kind] = file
    pairs.set(n, pair)
  }
  return pairs
}

async function read<S extends z.ZodTypeAny>(file: PrivateFile, schema: S): Promise<z.infer<S>> {
  let data: unknown
  try { data = JSON.parse((await file.text()).replace(/^\uFEFF/, '')) }
  catch { throw new Error('Não foi possível ler o JSON selecionado.') }
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new Error('O arquivo tem uma estrutura incompatível.')
  return parsed.data
}

// A origem fornece IDs às conversas. Itens do quiz não têm ID; o resumo
// do enunciado evita que uma reordenação quebre as referências existentes.
async function fingerprint(parts: string[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest.slice(0, 12), b => b.toString(16).padStart(2, '0')).join('')
}

export async function buildPrivateCatalog(files: readonly PrivateFile[]): Promise<PrivateCatalog> {
  const pairs = groupPrivateFiles(files)
  const sources = [], competencies = [], modules = [], questions = []
  for (const [order, pair] of [...pairs].sort(([a], [b]) => a-b)) {
    if (!pair.lesson || !pair.quiz) throw new Error('Cada módulo precisa dos dois arquivos: conversa e quiz.')
    const [lessonData, quizData] = await Promise.all([read(pair.lesson, conversation), read(pair.quiz, quiz)])
    if (quizData.moduleId !== order) throw new Error('O número do arquivo não corresponde ao identificador do quiz.')
    const id = 'pr-mod-' + order
    const sourceIds = [id + '-fonte']
    const competencyId = id + '-competencia'
    const lessonId = id + '-leitura'
    sources.push({ id: sourceIds[0], title: 'Professor Redação · referência privada · módulo ' + order, origin: 'private-import' })
    competencies.push({ id: competencyId, title: quizData.title })
    const reading = lessonData.messages.map(message => ({
      id: id + '-mensagem-' + message.id, kind: 'concept', text: message.sequence.map(turn => [turn.message, turn.emoji].filter(Boolean).join(' ')).join('\n\n'),
    }))
    const blocks: typeof reading = []
    let consumed = 0
    // Os arquivos não vinculam perguntas e mensagens. Distribuir os itens
    // proporcionalmente preserva a sequência interna das duas fontes.
    for (const [index, item] of quizData.items.entries()) {
      const boundary = Math.ceil((index + 1) * reading.length / quizData.items.length)
      blocks.push(...reading.slice(consumed, boundary))
      consumed = boundary
      if (item.type === 'conversation') {
        blocks.push({ id: id + '-fala-' + await fingerprint([item.message]), kind: 'concept', text: item.message })
        continue
      }
      const base = { version: 1, competencyId, lessonId, afterBlockId: blocks[blocks.length - 1].id, type: 'choice',
        sourceIds, explanation: item.explanation }
      if (item.questionType === 'matching') {
        const options = [...new Set(item.pairs.map(pair => pair.right))]
        for (const pair of item.pairs) {
          questions.push({ ...base, id: id + '-par-' + await fingerprint([item.question, pair.left]),
            prompt: item.question + '\n\n' + pair.left, options, answer: options.indexOf(pair.right) })
        }
      } else {
        if (item.options.filter(o => o.correct).length !== 1 || (item.questionType === 'true-false' && item.options.length !== 2)) {
          throw new Error('O gabarito ou as alternativas de uma questão são incompatíveis.')
        }
        questions.push({ ...base, id: id + '-questao-' + await fingerprint([item.question]), prompt: item.question,
          options: item.options.map(o => o.text), answer: item.options.findIndex(o => o.correct) })
      }
    }
    modules.push({ id, title: quizData.title, order, version: 1, lessons: [
      { id: lessonId, title: 'Leitura · ' + quizData.title, competencyIds: [competencyId], sourceIds, blocks },
    ] })
  }
  const parsed = privateCatalogSchema.safeParse({ version: 1, sources, competencies, modules, questions })
  if (!parsed.success) throw new Error('Os itens convertidos têm valores repetidos, incompletos ou fora dos limites.')
  return parsed.data
}
