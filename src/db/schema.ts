export interface Sql {
  execute(sql: string): Promise<void>
  run(sql: string, values: (string | number | null)[]): Promise<void>
  rows<T>(sql: string, values?: (string | number | null)[]): Promise<T[]>
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
}

export async function transaction<T>(db: Sql, work: () => Promise<T>): Promise<T> {
  await db.begin()
  try {
    const result = await work()
    await db.commit()
    return result
  } catch (error) {
    await db.rollback()
    throw error
  }
}

const initial = `
CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL);
CREATE TABLE catalog_metadata (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL);
CREATE TABLE sources (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, origin TEXT NOT NULL);
CREATE TABLE competencies (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL);
CREATE TABLE modules (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, sort_order INTEGER NOT NULL, content_version INTEGER NOT NULL);
CREATE TABLE lessons (id TEXT PRIMARY KEY NOT NULL, module_id TEXT NOT NULL REFERENCES modules(id), title TEXT NOT NULL, sort_order INTEGER NOT NULL, content_version INTEGER NOT NULL, source_ids_json TEXT NOT NULL, competency_ids_json TEXT NOT NULL);
CREATE TABLE content_blocks (lesson_id TEXT NOT NULL REFERENCES lessons(id), stable_key TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL, sort_order INTEGER NOT NULL, PRIMARY KEY(lesson_id,stable_key,version));
CREATE TABLE questions (id TEXT PRIMARY KEY NOT NULL, lesson_id TEXT NOT NULL REFERENCES lessons(id), competency_id TEXT NOT NULL REFERENCES competencies(id), kind TEXT NOT NULL, version INTEGER NOT NULL, payload_json TEXT NOT NULL);
CREATE TABLE lesson_progress (lesson_id TEXT PRIMARY KEY NOT NULL REFERENCES lessons(id), last_block_key TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reading','done')), updated_at TEXT NOT NULL);
CREATE TABLE annotations (id TEXT PRIMARY KEY NOT NULL, lesson_id TEXT NOT NULL REFERENCES lessons(id), block_key TEXT NOT NULL, block_version INTEGER NOT NULL, quote TEXT NOT NULL, prefix TEXT NOT NULL, suffix TEXT NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, color TEXT NOT NULL CHECK(color IN ('yellow','green','blue')), note TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX annotations_lesson ON annotations(lesson_id);
CREATE TABLE review_items (id TEXT PRIMARY KEY NOT NULL, lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id), due_date TEXT NOT NULL, stage INTEGER NOT NULL CHECK(stage BETWEEN 0 AND 4));
CREATE INDEX review_due ON review_items(due_date);
CREATE TABLE review_events (id TEXT PRIMARY KEY NOT NULL, review_item_id TEXT NOT NULL REFERENCES review_items(id), result TEXT NOT NULL, reviewed_at TEXT NOT NULL);
`

export async function migrate(db: Sql, scripts: readonly string[] = [initial]) {
  await db.execute('PRAGMA foreign_keys=ON')
  await transaction(db, async () => {
    await db.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
    const applied = await db.rows<{version:number}>('SELECT version FROM schema_migrations ORDER BY version')
    if (applied.length > scripts.length || applied.some((r,i) => r.version !== i + 1)) {
      throw new Error('Versão do banco incompatível. Seus dados foram preservados.')
    }
    for (let i = applied.length; i < scripts.length; i++) {
      await db.execute(scripts[i]!)
      await db.run('INSERT INTO schema_migrations VALUES (?,?)', [i + 1, new Date().toISOString()])
    }
  })
}
