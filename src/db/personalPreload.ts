import type { Catalog } from '../catalog'
import type { Sql } from './schema'
import type { Repository } from './repository'

export async function preloadPersonal(db: Sql, repo: Pick<Repository,'importPrivate'>, ids: readonly string[],
  loadPack: () => Promise<Catalog | null>) {
  if (!ids.length) return
  const existing = new Set((await db.rows<{id:string}>('SELECT module_id AS id FROM private_modules')).map(row => row.id))
  const missing = new Set(ids.filter(id => !existing.has(id)))
  if (!missing.size) return
  const pack = await loadPack()
  if (!pack) throw new Error('Conteúdo do perfil pessoal indisponível.')
  const modules = pack.modules.filter(m => missing.has(m.id))
  if (modules.length !== missing.size) throw new Error('O catálogo do perfil pessoal está incompleto.')
  const lessons = modules.flatMap(m => m.lessons)
  const lessonIds = new Set(lessons.map(l => l.id))
  const questions = pack.questions.filter(q => lessonIds.has(q.lessonId))
  const sources = new Set([...lessons, ...questions].flatMap(item => item.sourceIds))
  const skills = new Set(lessons.flatMap(l => l.competencyIds))
  await repo.importPrivate({ ...pack, modules, questions,
    competencies: pack.competencies.filter(c => skills.has(c.id)), sources: pack.sources.filter(s => sources.has(s.id)) })
}
