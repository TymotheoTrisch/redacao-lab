import { describe, expect, it } from 'vitest'
import { catalog, catalogSchema, type Catalog } from '../src/catalog'

describe('catálogo offline', () => {
  it('entrega duas aulas e cinco questões por eixo, com prática e feedback', () => {
    expect(catalog.modules.map(item => item.id)).toEqual(['interpretacao', 'tese', 'argumentacao', 'concordancia', 'coesao'])
    for (const module of catalog.modules) {
      expect(module.lessons.length).toBeGreaterThanOrEqual(2)
      const questions = catalog.questions.filter(item => module.lessons.some(lesson => lesson.id === item.lessonId))
      expect(questions.length).toBeGreaterThanOrEqual(5)
      for (const lesson of module.lessons) {
        expect(lesson.blocks.map(block => block.kind)).toEqual(expect.arrayContaining(['concept', 'example', 'practice']))
        expect(questions.some(question => question.lessonId === lesson.id)).toBe(true)
      }
      for (const question of questions) {
        expect(question.options[question.answer]).toBeTruthy()
        expect(question.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })

  const invalidCases: [string, (copy: Catalog) => void][] = [
    ['resposta inexistente', copy => { copy.questions[0].answer = copy.questions[0].options.length }],
    ['alternativas repetidas', copy => { copy.questions[0].options = ['Igual', 'Igual'] }],
    ['aula inexistente', copy => { copy.questions[0].lessonId = 'aula-ausente' }],
    ['competência de outra aula', copy => { copy.questions[0].competencyId = 'coesao' }],
    ['fonte ausente', copy => { copy.modules[0].lessons[0].sourceIds = ['fonte-ausente'] }],
    ['ID de bloco repetido', copy => {
      const blocks = copy.modules[0].lessons[0].blocks
      blocks.push(blocks[0])
    }],
  ]

  it.each(invalidCases)('recusa %s', (_description, invalidate) => {
    const copy = structuredClone(catalog)
    invalidate(copy)
    expect(catalogSchema.safeParse(copy).success).toBe(false)
  })
})
