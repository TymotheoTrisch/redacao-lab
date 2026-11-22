import { z } from 'zod'
import { capture, locate, type SavedAnchor } from './anchors'
import { transaction, type Sql } from './schema'

const colorSchema = z.enum(['yellow','blue','green'])
export type Color = z.infer<typeof colorSchema>
const noteSchema = z.string().max(4000)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value+'T12:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value
})
const preferencesSchema = z.object({
  examDate: z.union([z.literal(''),dateSchema]),
  minutes: z.number().int().min(1).max(1440),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(v => new Set(v).size === v.length),
  theme: z.enum(['system','light','dark'])
}).strict()
export type Preferences = z.infer<typeof preferencesSchema>
export interface Progress { lessonId:string; blockId:string; status:'reading'|'done'; updatedAt:string }
export interface Annotation { id:string; lessonId:string; blockId:string; quote:string; start:number|null; end:number|null; color:Color; note:string }
export interface Review { id:string; lessonId:string; dueDate:string; stage:number }

function localDay(date: Date, days = 0) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return [next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-')
}

export class Repository {
  private pending: Promise<unknown> = Promise.resolve()
  constructor(private db: Sql, private now = () => new Date(), private uuid = () => crypto.randomUUID() as string) {}

  // Uma conexão nativa compartilhada: nenhuma outra ação entra em uma transação aberta.
  private queue<T>(work: () => Promise<T>): Promise<T> {
    const task = this.pending.then(work)
    this.pending = task.catch(() => {})
    return task
  }
  private async block(lessonId:string, blockId:string) {
    const [block] = await this.db.rows<{body:string;version:number}>(`SELECT b.body,b.version FROM content_blocks b
      JOIN lessons l ON b.lesson_id=l.id AND b.version=l.content_version WHERE l.id=? AND b.stable_key=?`,[lessonId,blockId])
    if (!block) throw new Error('Bloco indisponível nesta aula.')
    return block
  }
  preferences(): Promise<Preferences> {
    return this.queue(async () => {
      const [row] = await this.db.rows<{value_json:string}>("SELECT value_json FROM settings WHERE key='preferences'")
      return row ? preferencesSchema.parse(JSON.parse(row.value_json)) :
        {examDate:'',minutes:30,days:[1,2,3,4,5],theme:'system' as const}
    })
  }
  savePreferences(value: Preferences) {
    return this.queue(() => this.db.run(`INSERT INTO settings VALUES ('preferences',?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json`,[JSON.stringify(preferencesSchema.parse(value))]))
  }
  progress() {
    return this.queue(() => this.db.rows<Progress>(`SELECT lesson_id AS lessonId,last_block_key AS blockId,status,
      updated_at AS updatedAt FROM lesson_progress ORDER BY updated_at DESC,rowid DESC`))
  }
  saveProgress(lessonId:string, blockId:string, status?:Progress['status']) {
    return this.queue(async () => {
      await this.block(lessonId,blockId)
      if (status !== undefined) z.enum(['reading','done']).parse(status)
      await this.db.run(`INSERT INTO lesson_progress VALUES (?,?,?,?)
        ON CONFLICT(lesson_id) DO UPDATE SET last_block_key=excluded.last_block_key,
        status=coalesce(?,lesson_progress.status), updated_at=excluded.updated_at`,
        [lessonId,blockId,status ?? 'reading',this.now().toISOString(),status ?? null])
    })
  }
  annotations(lessonId:string):Promise<Annotation[]> {
    return this.queue(async () => {
      const rows = await this.db.rows<SavedAnchor & { id:string; blockId:string; body:string|null; currentVersion:number|null; color:Color; note:string }>(
        `SELECT a.id,a.block_key AS blockId,a.block_version AS version,a.start_offset AS start,a.end_offset AS end,
         a.prefix,a.suffix,a.quote,a.color,a.note,b.body,b.version AS currentVersion FROM annotations a
         JOIN lessons l ON l.id=a.lesson_id LEFT JOIN content_blocks b ON b.lesson_id=a.lesson_id AND b.stable_key=a.block_key
         AND b.version=l.content_version WHERE a.lesson_id=? ORDER BY a.created_at,a.rowid`, [lessonId])
      return rows.map(row => {
        const start = row.body !== null && row.currentVersion !== null ? locate(row.body,row.currentVersion,row) : null
        return {id:row.id,lessonId,blockId:row.blockId,quote:row.quote,start,
          end:start === null ? null : start+row.quote.length,color:row.color,note:row.note}
      })
    })
  }
  addAnnotation(lessonId:string,blockId:string,start:number,end:number,color:Color,note:string) {
    return this.queue(async () => {
      const {body,version} = await this.block(lessonId,blockId)
      const anchor = capture(body,start,end,version)
      const time = this.now().toISOString()
      await this.db.run('INSERT INTO annotations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',[
        this.uuid(),lessonId,blockId,version,anchor.quote,anchor.prefix,anchor.suffix,start,end,
        colorSchema.parse(color),noteSchema.parse(note),time,time])
    })
  }
  editAnnotation(id:string,color:Color,note:string) {
    return this.queue(() => this.db.run('UPDATE annotations SET color=?,note=?,updated_at=? WHERE id=?',
      [colorSchema.parse(color),noteSchema.parse(note),this.now().toISOString(),id]))
  }
  deleteAnnotation(id:string) {
    return this.queue(() => this.db.run('DELETE FROM annotations WHERE id=?',[id]))
  }
  reviews() {
    return this.queue(() => this.db.rows<Review>('SELECT id,lesson_id AS lessonId,due_date AS dueDate,stage FROM review_items ORDER BY due_date,id'))
  }
  markReview(lessonId:string) {
    return this.queue(() => this.db.run(`INSERT INTO review_items VALUES (?,?,?,0) ON CONFLICT(lesson_id) DO NOTHING`,
      [this.uuid(),lessonId,localDay(this.now(),1)]))
  }
  review(id:string,success:boolean) {
    return this.queue(() => transaction(this.db,async () => {
      z.boolean().parse(success)
      const [item] = await this.db.rows<{stage:number}>('SELECT stage FROM review_items WHERE id=?',[id])
      if (!item) throw new Error('Reforço não encontrado.')
      const stage = success ? Math.min(item.stage+1,4) : 0
      const interval = [1,1,3,7,14][stage]!
      const now = this.now()
      await this.db.run('UPDATE review_items SET stage=?,due_date=? WHERE id=?',[stage,localDay(now,interval),id])
      await this.db.run('INSERT INTO review_events VALUES (?,?,?,?)',[this.uuid(),id,success?'success':'error',now.toISOString()])
    }))
  }
  postpone(id:string,date:string) {
    return this.queue(async () => {
      if (dateSchema.parse(date) <= localDay(this.now())) throw new Error('Escolha uma data futura para adiar.')
      await this.db.run('UPDATE review_items SET due_date=? WHERE id=?',[date,id])
    })
  }
}
