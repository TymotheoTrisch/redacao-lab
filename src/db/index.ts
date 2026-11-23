import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { catalog } from '../catalog'
import { Repository } from './repository'
import { migrate, type Sql } from './schema'
import { seed } from './seed'
import { moduleIds, loadPack } from 'virtual:redacao-profile'
import { preloadPersonal } from './personalPreload'

export { Repository }
export type { Annotation, Color, Preferences, Progress, Review } from './repository'

const manager = new SQLiteConnection(CapacitorSQLite)
const name = 'redacaolab'
let opening: Promise<Repository> | undefined

async function initialize() {
  if (Capacitor.getPlatform() !== 'android') throw new Error('Abra o aplicativo no Android para acessar o banco de estudos.')
  await manager.checkConnectionsConsistency()
  const exists = (await manager.isConnection(name,false)).result
  const conn = exists ? await manager.retrieveConnection(name,false) :
    await manager.createConnection(name,false,'no-encryption',1,false)
  if (!(await conn.isDBOpen()).result) await conn.open()
  const db: Sql = {
    async execute(sql) { await conn.execute(sql,false) },
    async run(sql,values) { await conn.run(sql,values,false) },
    async rows<T>(sql:string,values:(string|number|null)[] = []) { return ((await conn.query(sql,values)).values ?? []) as T[] },
    async begin() { await conn.beginTransaction() },
    async commit() { await conn.commitTransaction() },
    async rollback() { await conn.rollbackTransaction() }
  }
  await migrate(db)
  await seed(db,catalog)
  const repo = new Repository(db)
  await preloadPersonal(db, repo, moduleIds, loadPack)
  return repo
}

export function openRepository(): Promise<Repository> {
  opening ??= initialize().catch(error => { opening = undefined; throw error })
  return opening
}
