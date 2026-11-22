import { z } from 'zod'
import rawCatalog from '../public/content/catalog.json'

const id = z.string().regex(/^[a-z][a-z0-9-]{0,95}$/)
const text = z.string().trim().min(1).max(8000)
const version = z.number().int().positive()
const ids = z.array(id).nonempty().refine(items => new Set(items).size === items.length)

const block = z.object({
  id, kind: z.enum(['concept', 'example', 'practice']), text,
}).strict()

const lesson = z.object({
  id, title: text, competencyIds: ids, sourceIds: ids, blocks: z.array(block).nonempty(),
}).strict()

const question = z.object({
  id, version, competencyId: id, lessonId: id, type: z.literal('choice'),
  afterBlockId: id.optional(), prompt: text, options: z.array(text).min(2).max(8), answer: z.number().int().nonnegative(),
  explanation: text, sourceIds: ids,
}).strict().superRefine((item, ctx) => {
  if (item.answer >= item.options.length || new Set(item.options).size !== item.options.length) {
    ctx.addIssue({ code: 'custom', message: 'Alternativas repetidas ou resposta fora do intervalo.' })
  }
})

export const catalogSchema = z.object({
  version,
  sources: z.array(z.object({ id, title: text, origin: z.enum(['original','private-import']) }).strict()).nonempty(),
  competencies: z.array(z.object({ id, title: text }).strict()).nonempty(),
  modules: z.array(z.object({
    id, title: text, order: version, version, lessons: z.array(lesson).nonempty(),
  }).strict()).nonempty(),
  questions: z.array(question).nonempty(),
}).strict().superRefine((value, ctx) => {
  const lessons = value.modules.flatMap(module => module.lessons)
  const hasDuplicateIds = (items: { id: string }[]) => new Set(items.map(item => item.id)).size !== items.length
  for (const items of [value.sources, value.competencies, value.modules, lessons, value.questions, lessons.flatMap(item => item.blocks)]) {
    if (hasDuplicateIds(items)) ctx.addIssue({ code: 'custom', message: 'Identificador repetido no catálogo.' })
  }
  const sources = new Set(value.sources.map(source => source.id))
  const competencies = new Set(value.competencies.map(item => item.id))
  const lessonById = new Map(lessons.map(item => [item.id, item]))
  for (const item of [...lessons, ...value.questions]) {
    if (item.sourceIds.some(key => !sources.has(key))) ctx.addIssue({ code: 'custom', message: 'Fonte desconhecida.' })
  }
  for (const item of lessons) {
    if (item.competencyIds.some(key => !competencies.has(key))) ctx.addIssue({ code: 'custom', message: 'Competência desconhecida.' })
  }
  for (const item of value.questions) {
    if (!lessonById.get(item.lessonId)?.competencyIds.includes(item.competencyId)) {
      ctx.addIssue({ code: 'custom', message: 'Questão sem aula e competência correspondentes.' })
    }
  }
})

export const catalog = catalogSchema.parse(rawCatalog)
export type Catalog = typeof catalog
