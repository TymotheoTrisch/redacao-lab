import { defineStore } from 'pinia'
import { catalog } from './catalog'

export const lessons = catalog.modules.flatMap(module => module.lessons)
export type Lesson = typeof lessons[number]
export const useNavigation = defineStore('navigation', {
  state: () => ({ screen: 'library' as 'library' | 'reader' | 'review' | 'settings', query: '' })
})

export function searchModules(query: string) {
  const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const term = fold(query.trim())
  return catalog.modules.map(module => ({
    ...module,
    lessons: module.lessons.filter(lesson => fold([module.title, lesson.title, ...lesson.blocks.map(b => b.text)].join(' ')).includes(term))
  })).filter(module => module.lessons.length)
}
