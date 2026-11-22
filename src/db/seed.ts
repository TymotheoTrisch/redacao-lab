import { transaction, type Sql } from './schema'

export interface SeedCatalog {
  version: number
  sources: readonly {id:string; title:string; origin:string}[]
  competencies: readonly {id:string; title:string}[]
  modules: readonly {id:string; title:string; version:number; lessons: readonly {
    id:string; title:string; sourceIds:readonly string[]; competencyIds:readonly string[]
    blocks: readonly {id:string; kind:string; text:string}[]
  }[]}[]
  questions: readonly {id:string; lessonId:string; competencyId:string; type:string; version:number}[]
}

// Os objetos já foram validados pelo carregador do catálogo. Somente tabelas
// editoriais recebem atualizações. O histórico do estudante tem vida própria.
export async function seed(db: Sql, data: SeedCatalog) {
  await transaction(db, async () => {
    const [installed] = await db.rows<{version:number}>('SELECT version FROM catalog_metadata WHERE id=1')
    if (installed?.version === data.version) return
    if (installed && installed.version > data.version) throw new Error('A versão instalada do catálogo é mais recente.')
    for (const source of data.sources) {
      await db.run(`INSERT INTO sources VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, origin=excluded.origin`, [source.id,source.title,source.origin])
    }
    for (const competency of data.competencies) {
      await db.run('INSERT INTO competencies VALUES (?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title',
        [competency.id,competency.title])
    }
    for (const [order,mod] of data.modules.entries()) {
      const [current] = await db.rows<{content_version:number}>('SELECT content_version FROM modules WHERE id=?',[mod.id])
      if (current && current.content_version > mod.version) throw new Error('O conteúdo instalado exige uma versão mais recente do aplicativo.')
      await db.run(`INSERT INTO modules VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        title=excluded.title, sort_order=excluded.sort_order, content_version=excluded.content_version`,[mod.id,mod.title,order,mod.version])
      for (const [lessonOrder,lesson] of mod.lessons.entries()) {
        await db.run(`INSERT INTO lessons VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
          module_id=excluded.module_id,title=excluded.title,sort_order=excluded.sort_order,content_version=excluded.content_version,
          source_ids_json=excluded.source_ids_json,competency_ids_json=excluded.competency_ids_json`,
          [lesson.id,mod.id,lesson.title,lessonOrder,mod.version,JSON.stringify(lesson.sourceIds),JSON.stringify(lesson.competencyIds)])
        for (const [blockOrder,block] of lesson.blocks.entries()) {
          await db.run(`INSERT INTO content_blocks VALUES (?,?,?,?,?,?) ON CONFLICT(lesson_id,stable_key,version) DO UPDATE SET
            body=excluded.body,kind=excluded.kind,sort_order=excluded.sort_order`,
            [lesson.id,block.id,block.text,block.kind,mod.version,blockOrder])
        }
      }
    }
    for (const q of data.questions) {
      await db.run(`INSERT INTO questions VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        lesson_id=excluded.lesson_id,competency_id=excluded.competency_id,kind=excluded.kind,
        version=excluded.version,payload_json=excluded.payload_json`,[q.id,q.lessonId,q.competencyId,q.type,q.version,JSON.stringify(q)])
    }
    await db.run('INSERT INTO catalog_metadata VALUES (1,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version',[data.version])
  })
}
