import { describe, expect, it } from 'vitest'
import { buildPrivateCatalog, groupPrivateFiles, privateCatalogSchema, type PrivateFile } from '../src/privateCatalog'
import type { SeedCatalog } from '../src/db/seed'

const speech = { character: 'Guia fictício', message: 'Observe a sequência.' }
const common = { type: 'quiz', feedbackCorrect: speech, feedbackWrong: speech, explanation: 'Explicação sintética.' }
const choice = { ...common, questionType: 'multiple-choice', question: 'Qual figura tem três lados?',
  options: [{ text: 'Triângulo', correct: true }, { text: 'Quadrado', correct: false }] }
const matching = { ...common, questionType: 'matching', question: 'Associe o número ao nome.',
  pairs: [{ left: 'Dois', right: 'Par' }, { left: 'Três', right: 'Ímpar' }, { left: 'Quatro', right: 'Par' }] }
const messages = [42, 8, 3].map(id => ({ type: 'conversation', id, sequence: [speech] }))
const lesson = { messages }
const quiz = { moduleId: 4, title: 'Geometria sintética', items: [choice, { type: 'conversation', ...speech }, matching] }

function file(name: string, obj: unknown): PrivateFile {
  const raw = JSON.stringify(obj)
  return { name, size: new TextEncoder().encode(raw).length, text: async () => raw }
}
const lessonFile = file('modulo4.json', lesson)
const quizFile = file('modulo4_quiz.json', quiz)

describe('importação privada com exemplos sintéticos', () => {
  it('intercala questões e falas na leitura preservando ordem, origem e gabaritos de associação', async () => {
    const data = await buildPrivateCatalog([quizFile, lessonFile])
    const compatible: SeedCatalog = data
    expect(compatible.modules).toHaveLength(1)
    const [module] = data.modules
    expect(module.lessons).toHaveLength(1)
    const blocks = module.lessons[0].blocks
    expect(blocks.map(b => b.id)).toEqual(['pr-mod-4-mensagem-42', 'pr-mod-4-mensagem-8', expect.stringMatching(/^pr-mod-4-fala-/), 'pr-mod-4-mensagem-3'])
    expect(data.questions.map(q => q.afterBlockId)).toEqual([blocks[0].id,blocks[3].id,blocks[3].id,blocks[3].id])
    expect(data.questions.map(q => q.options[q.answer])).toEqual(['Triângulo','Par','Ímpar','Par'])
    expect(data.sources[0].origin).toBe('private-import')
    expect(data.modules[0].lessons[0].sourceIds).toContain(data.sources[0].id)
  })

  it('mantém IDs das questões e blocos após reordenação das fontes', async () => {
    const original = await buildPrivateCatalog([lessonFile, quizFile])
    const changed = await buildPrivateCatalog([file(lessonFile.name, { messages: [...messages].reverse() }),
      file(quizFile.name, { ...quiz, items: [...quiz.items].reverse() })])
    expect(new Set(changed.questions.map(q => q.id))).toEqual(new Set(original.questions.map(q => q.id)))
    expect(new Set(changed.modules[0].lessons[0].blocks.map(b => b.id))).toEqual(new Set(original.modules[0].lessons[0].blocks.map(b => b.id)))
  })

  it('aceita um turno com emoji como única mensagem', async () => {
    const copy = { messages: [{ ...messages[0], sequence: [{ ...speech, message: '', emoji: '🌻' }] }] }
    const data = await buildPrivateCatalog([file(lessonFile.name, copy), quizFile])
    expect(data.modules[0].lessons[0].blocks[0].text).toBe('🌻')
  })

  it('rejeita limites e duplicatas antes de ler o conteúdo', () => {
    expect(() => groupPrivateFiles([lessonFile, lessonFile])).toThrow('dois arquivos')
    expect(() => groupPrivateFiles([{ ...lessonFile, size: 1048577 }])).toThrow('Limite')
    expect(() => groupPrivateFiles([{ ...lessonFile, name: 'manifest.json' }])).toThrow('Escolha apenas')
  })

  it.each([
    ['par incompleto', [lessonFile]],
    ['identificador de módulo divergente', [lessonFile, file(quizFile.name, { ...quiz, moduleId: 2 })]],
    ['arquivo inválido', [quizFile, { ...lessonFile, text: async () => '{' }]],
    ['IDs de origem duplicados', [quizFile, file(lessonFile.name, { messages: [messages[0], messages[0]] })]],
    ['questão sem gabarito único', [lessonFile, file(quizFile.name, { ...quiz, items: [{ ...choice, options: choice.options.map(o => ({ ...o, correct: false })) }] })]],
  ] as [string, PrivateFile[]][])('rejeita %s', async (_label, files) => {
    await expect(buildPrivateCatalog(files)).rejects.toThrow()
  })

  it('rejeita colisão com identificadores públicos e referências de trecho ausentes', async () => {
    const data = await buildPrivateCatalog([lessonFile, quizFile])
    const first = structuredClone(data)
    first.modules[0].id = 'tese'
    expect(privateCatalogSchema.safeParse(first).success).toBe(false)
    data.questions[0].afterBlockId = 'pr-inexistente'
    expect(privateCatalogSchema.safeParse(data).success).toBe(false)
  })
})
