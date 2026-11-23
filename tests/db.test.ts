import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { capture, locate } from '../src/db/anchors'
import { migrate, migrations, type Sql } from '../src/db/schema'
import { seed } from '../src/db/seed'
import { Repository } from '../src/db/repository'
import { catalog } from '../src/catalog'
import { buildPrivateCatalog } from '../src/privateCatalog'
import { preloadPersonal } from '../src/db/personalPreload'

function fixture(text='Há 🌱 uma ideia.', version=1) {
  return {
    version,
    sources:[{id:'s',title:'Fonte sintética',origin:'original'}],
    competencies:[{id:'c',title:'Competência sintética'}],
    modules:[{id:'m',title:'Módulo sintético',version,lessons:[{
      id:'l',title:'Aula de teste',sourceIds:['s'],competencyIds:['c'],blocks:[{id:'b',kind:'paragraph',text}]
    }]}],
    questions:[{id:'q',lessonId:'l',competencyId:'c',type:'choice',version:1}]
  }
}
const cleanups:(()=>void)[] = []
afterEach(() => { for (const clean of cleanups.splice(0).reverse()) clean() })

function connect(file=':memory:') {
  const native = new DatabaseSync(file)
  let closed = false
  function close() { if (!closed) { native.close(); closed=true } }
  cleanups.push(close)
  const db:Sql = {
    async execute(sql) { native.exec(sql) },
    async run(sql,args) { native.prepare(sql).run(...args) },
    async rows<T>(sql:string,args:(string|number|null)[]=[]) { return native.prepare(sql).all(...args) as T[] },
    async begin() { native.exec('BEGIN IMMEDIATE') },
    async commit() { native.exec('COMMIT') },
    async rollback() { native.exec('ROLLBACK') }
  }
  return {db,close,repo:new Repository(db,() => new Date(2026,10,22,23,45))}
}

describe('SQLite de estudo', () => {
  it('instala todas as aulas, blocos, questões e fontes do pacote embarcado', async () => {
    const {db} = connect()
    await migrate(db)
    await seed(db,catalog)
    const lessons = catalog.modules.flatMap(mod => mod.lessons)
    const blocks = lessons.flatMap(lesson => lesson.blocks)
    expect(await db.rows('SELECT COUNT(*) AS n FROM lessons')).toEqual([{n:lessons.length}])
    expect(await db.rows('SELECT COUNT(*) AS n FROM content_blocks')).toEqual([{n:blocks.length}])
    expect(await db.rows('SELECT COUNT(*) AS n FROM questions')).toEqual([{n:catalog.questions.length}])
    expect(await db.rows('SELECT COUNT(*) AS n FROM sources')).toEqual([{n:catalog.sources.length}])
    expect(await db.rows('PRAGMA foreign_key_check')).toEqual([])
  })
  it('reabre arquivo, repete migration/seed e preserva preferências, progresso, anotação e reforço', async () => {
    const dir=mkdtempSync(join(tmpdir(),'redacao-lab-'))
    cleanups.push(() => rmSync(dir,{recursive:true,force:true}))
    const file=join(dir,'teste.sqlite')
    const first=connect(file)
    await migrate(first.db)
    await seed(first.db,fixture())
    const prefs = {examDate:'2027-01-02',minutes:40,days:[0,6],theme:'dark' as const}
    await first.repo.savePreferences(prefs)
    await first.repo.saveProgress('l','b','done')
    await first.repo.addAnnotation('l','b',3,5,'blue',"'); DROP TABLE lessons; --")
    await first.repo.markReview('l')
    first.close()
    const {db,repo}=connect(file)
    await migrate(db)
    await seed(db,fixture())
    await repo.saveProgress('l','b')
    await repo.markReview('l')
    expect(await repo.preferences()).toEqual(prefs)
    expect(await repo.progress()).toMatchObject([{lessonId:'l',blockId:'b',status:'done'}])
    expect(await repo.annotations('l')).toMatchObject([{quote:'🌱',start:3,end:5,color:'blue',note:"'); DROP TABLE lessons; --"}])
    expect(await repo.reviews()).toMatchObject([{lessonId:'l',dueDate:'2026-11-23',stage:0}])
    expect(await db.rows('SELECT id FROM questions')).toEqual([{id:'q'}])
    expect(await db.rows('PRAGMA foreign_keys')).toEqual([{foreign_keys:1}])
  })
  it('rollback de migration incremental preserva schema, dados sintéticos e versão anterior', async () => {
    const {db,repo}=connect()
    await migrate(db)
    await seed(db,fixture())
    await repo.addAnnotation('l','b',0,2,'green','preservar')
    await expect(migrate(db,[...migrations,'CREATE TABLE partial (id TEXT); INSERT INTO missing VALUES (1);'])).rejects.toThrow()
    expect(await db.rows("SELECT name FROM sqlite_master WHERE name='partial'")).toEqual([])
    expect(await db.rows('SELECT version FROM schema_migrations')).toEqual(migrations.map((_,i) => ({version:i+1})))
    expect((await repo.annotations('l'))[0]?.note).toBe('preservar')
    await migrate(db,[...migrations,'CREATE TABLE incremental (id TEXT)'])
    await expect(migrate(db)).rejects.toThrow('incompatível')
    expect((await repo.annotations('l'))[0]?.note).toBe('preservar')
  })
  it('rejeita catálogo parcial com FK inválida e mantém o conteúdo anterior', async () => {
    const {db}=connect()
    await migrate(db)
    await seed(db,fixture())
    const broken=fixture('substituto',2)
    broken.questions[0]!.lessonId='ausente'
    await expect(seed(db,broken)).rejects.toThrow()
    expect(await db.rows('SELECT body,version FROM content_blocks')).toEqual([{body:'Há 🌱 uma ideia.',version:1}])
  })
  it('reancora pelo contexto e preserva órfãs após mudança ou remoção do bloco', async () => {
    const {db,repo}=connect()
    await migrate(db)
    await seed(db,fixture('antes ideia depois'))
    await repo.addAnnotation('l','b',6,11,'yellow','texto')
    await seed(db,fixture('ideia extra; antes ideia depois',2))
    expect((await repo.annotations('l'))[0]?.start).toBe(19)
    await seed(db,fixture('ideia/ideia',3))
    const [orphan]=await repo.annotations('l')
    expect(orphan).toMatchObject({start:null,end:null,quote:'ideia',note:'texto'})
    const removed = fixture('outra',4)
    removed.modules[0]!.lessons[0]!.blocks[0]!.id='outro'
    await seed(db,removed)
    expect((await repo.annotations('l'))[0]?.start).toBeNull()
    await repo.editAnnotation(orphan!.id,'green','revisada')
    expect((await repo.annotations('l'))[0]).toMatchObject({color:'green',note:'revisada'})
    await repo.deleteAnnotation(orphan!.id)
    expect(await repo.annotations('l')).toEqual([])
  })
  it('serializa revisões e registra falha, acerto e adiamento em data local', async () => {
    const {db,repo}=connect()
    await migrate(db)
    await seed(db,fixture())
    await repo.markReview('l')
    const [{id}]=await repo.reviews()
    await Promise.all([repo.review(id,true),repo.review(id,true)])
    expect(await repo.reviews()).toMatchObject([{stage:2,dueDate:'2026-11-25'}])
    await repo.review(id,false)
    expect(await repo.reviews()).toMatchObject([{stage:0,dueDate:'2026-11-23'}])
    await repo.postpone(id,'2026-12-01')
    expect(await repo.reviews()).toMatchObject([{stage:0,dueDate:'2026-12-01'}])
    expect(await db.rows('SELECT COUNT(*) AS n FROM review_events')).toEqual([{n:3}])
  })
  it('rejeita preferências inválidas, referências desconhecidas e offsets fora do trecho',async () => {
    const {db,repo}=connect()
    await migrate(db)
    await seed(db,fixture())
    const prefs=await repo.preferences()
    await expect(repo.savePreferences({...prefs,examDate:'2027-02-30'})).rejects.toThrow()
    await expect(repo.savePreferences({...prefs,days:[1,1]})).rejects.toThrow()
    await expect(repo.addAnnotation('l','b',3,200,'yellow','')).rejects.toThrow()
    await expect(repo.saveProgress('l','ausente')).rejects.toThrow()
    await expect(repo.markReview('ausente')).rejects.toThrow()
    expect(await repo.preferences()).toEqual(prefs)
    expect(await repo.annotations('l')).toEqual([])
    expect(await repo.progress()).toEqual([])
  })
})
it('detecta ocorrência repetida mesmo quando as ocorrências se sobrepõem',() => {
  const saved=capture('aa',0,2,1)
  expect(locate('aaa',2,saved)).toBeNull()
})

it('recusa a substituição do texto de uma versão já anotada', async () => {
  const {db,repo} = connect()
  await migrate(db)
  await seed(db,fixture())
  await repo.addAnnotation('l','b',3,5,'yellow','Conservar trecho')
  const edited = fixture('Outro texto.')
  edited.version = 2
  await expect(seed(db,edited)).rejects.toThrow()
  expect(await repo.annotations('l')).toMatchObject([{quote:'🌱',start:3,end:5}])
  expect(await db.rows('SELECT version FROM catalog_metadata')).toEqual([{version:1}])
})


it('atualiza a base da 0.1.0, mantém a anotação e separa notas gerais por módulo', async () => {
  const {db,repo} = connect()
  await migrate(db,migrations.slice(0,1))
  await seed(db,catalog)
  const [first,second]=catalog.modules
  const lesson=first.lessons[0], block=lesson.blocks[0]
  await repo.addAnnotation(lesson.id,block.id,0,4,'blue','Versão anterior')
  await migrate(db)
  await repo.saveModuleNote(first.id,'Minha síntese')
  expect(await repo.moduleNote(first.id)).toBe('Minha síntese')
  expect(await repo.moduleNote(second.id)).toBe('')
  expect(await repo.annotations(lesson.id)).toMatchObject([{note:'Versão anterior'}])
})
it('registra o feedback original e usa apenas as vinte tentativas recentes no diagnóstico',async () => {
  const {db,repo}=connect()
  await migrate(db)
  await seed(db,catalog)
  const q=catalog.questions[0]
  await expect(repo.answer(q,q.options.length)).rejects.toThrow()
  await repo.answer(q,(q.answer+1)%q.options.length)
  for(let i=0;i<20;i++) await repo.answer(q,q.answer)
  const skill=catalog.competencies.find(c=>c.id===q.competencyId)!
  expect((await repo.diagnosis()).find(d=>d.title===skill.title)).toMatchObject({hits:20,total:20})
  expect(await repo.latestAnswers()).toEqual({[q.id]:q.answer})
  const [attempt]=await db.rows<{snapshot:string}>('SELECT snapshot FROM attempts LIMIT 1')
  expect(JSON.parse(attempt.snapshot)).toEqual(q)
})

it('reimporta pacote privado sem duplicar módulo ou perder a nota e recusa colisão divergente',async () => {
  const {db,repo}=connect()
  await migrate(db)
  await seed(db,catalog)
  const source={id:'pr-f',title:'Fonte sintética',origin:'private-import' as const}
  const competency={id:'pr-c',title:'Eixo sintético'}
  const module={id:'pr-m',order:1,version:1,title:'Exemplo privado',lessons:[{id:'pr-l',title:'Aula',
    competencyIds:[competency.id],sourceIds:[source.id],blocks:[{id:'pr-b',kind:'concept' as const,text:'Texto sintético'}]}]}
  const question={...catalog.questions[0],id:'pr-q',afterBlockId:'pr-b',competencyId:'pr-c',lessonId:'pr-l',sourceIds:['pr-f']}
  const pack={sources:[source],competencies:[competency],modules:[module],questions:[question],version:1}
  await repo.importPrivate(pack)
  await repo.saveModuleNote('pr-m','Nota privada sintética')
  await repo.importPrivate(pack)
  expect(await repo.privateModules()).toEqual([pack])
  module.title='Mudança divergente'
  await expect(repo.importPrivate(pack)).rejects.toThrow()
  expect(await repo.moduleNote('pr-m')).toBe('Nota privada sintética')
  expect(await db.rows('PRAGMA foreign_key_check')).toEqual([])
})

it('instala o perfil pessoal em base nova ou atualizada, preserva importações e dispensa releitura no reinício', async () => {
  const turn = { character:'Guia sintético', message:'Uma ideia inicial.' }
  const files = [1,2].flatMap(n => [
    ['modulo' + n + '.json', {messages:[{id:1,type:'conversation',sequence:[turn]}]}],
    ['modulo' + n + '_quiz.json', {moduleId:n,title:'Módulo sintético ' + n,items:[{
      type:'quiz',questionType:'multiple-choice',question:'Qual termo indica tempo?',
      options:[{text:'Hoje',correct:true},{text:'Aqui',correct:false}],explanation:'Hoje localiza a ação no tempo.',
      feedbackCorrect:turn,feedbackWrong:turn,
    }]}],
  ] as const).map(([name,body]) => ({name,size:JSON.stringify(body).length,text:async () => JSON.stringify(body)}))
  const pack = await buildPrivateCatalog(files)
  const ids = pack.modules.map(m => m.id)
  const neverLoad = async () => { throw new Error('O pacote não deveria ser carregado.') }
  for (const upgraded of [false,true]) {
    const {db,repo} = connect()
    await migrate(db)
    await seed(db,catalog)
    await preloadPersonal(db,repo,[],neverLoad)
    expect(await repo.privateModules()).toEqual([])
    if (upgraded) {
      const existing = await buildPrivateCatalog(files.slice(0,2))
      existing.modules[0].title = 'Edição local anterior'
      await repo.importPrivate(existing)
      await repo.saveModuleNote(ids[0],'Nota anterior')
      await repo.answer(existing.questions[0],0)
    }
    await preloadPersonal(db,repo,ids,async () => pack)
    await preloadPersonal(db,repo,ids,neverLoad)
    expect((await repo.privateModules()).flatMap(p => p.modules.map(m => m.id))).toEqual(ids)
    if (upgraded) {
      expect((await repo.privateModules())[0].modules[0].title).toBe('Edição local anterior')
      expect(await repo.moduleNote(ids[0])).toBe('Nota anterior')
      expect(await repo.latestAnswers()).toEqual({[pack.questions[0].id]:0})
    }
    expect(await db.rows('PRAGMA foreign_key_check')).toEqual([])
  }
})
