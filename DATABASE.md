# SQLite — contrato inicial v1
Banco privado do app. Ativar `PRAGMA foreign_keys=ON` por conexão. SQL parametrizado, índices e transações. IDs TEXT estáveis, timestamps ISO UTC, datas de agenda YYYY-MM-DD local. JSON validado por Zod. A implementação deve entregar SQL executável e testes, não apenas estas tabelas conceituais.

| Tabela | Campos principais além de id | Restrições / relações |
|---|---|---|
| settings | key, value_json | key UNIQUE; objetivo, data, disponibilidade |
| competencies | code, title | code UNIQUE |
| modules | title, sort_order, content_version, source_id | catálogo estável |
| lessons | module_id, title, sort_order, content_version | FK modules |
| content_blocks | lesson_id, stable_key, body, kind, version, sort_order | UNIQUE(lesson_id,stable_key,version) |
| sources | title, url, author, license, accessed_at | proveniência |
| lesson_progress | lesson_id, status, last_block_key, updated_at | UNIQUE lesson_id |
| annotations | lesson_id, block_key, block_version, quote, prefix, suffix, start_offset, end_offset, color, note, created_at, updated_at | FK lessons; offsets UTF-16 documentados; não apagar se bloco atualizar |
| questions | competency_id, lesson_id, kind, payload_json, version, source_id | tipos choice, boolean, matching, rewrite |
| attempts | question_id, question_version, answer_json, is_correct, feedback_snapshot, created_at | append-only; preservar versão/snapshot da pergunta |
| review_items | target_kind, target_id, due_date, stage, status | UNIQUE(target_kind,target_id); validar alvo no serviço |
| review_events | review_item_id, result, reviewed_at | FK review_items |
| study_plans | goal_date, availability_json, algorithm_version, created_at | histórico |
| study_tasks | plan_id, local_date, kind, target_id, minutes, status | preservar concluídas ao replanejar |
| rubrics | institution, edition, version, verified, source_id | versões imutáveis usadas por avaliações |
| rubric_criteria | rubric_id, code, label, max_units | UNIQUE(rubric_id,code); unidades inteiras |
| essays | title, theme, genre, outline_json, draft_text, updated_at | autosave |
| essay_versions | essay_id, body, created_at | snapshots imutáveis |
| evaluations | essay_version_id, rubric_id, origin, raw_json, created_at | FK; total calculado; origin manual/ai |
| criterion_scores | evaluation_id, criterion_id, score_units, explanation, assessable | UNIQUE par; score nulo se não avaliável |
| writing_errors | evaluation_id, competency_id, quote, correction, explanation, status | frases originais preservadas |
| repertoire | title, summary, application, limitation, source_id, tags_json | fonte e verificação |
| news_articles | canonical_url, title, summary, source_id, published_at, fetched_at, saved | URL UNIQUE |
| conversations | title, context_kind, context_id, created_at | local |
| messages | conversation_id, role, body, created_at | texto tratado como dado |
| ai_exchanges | request_id, operation, context_hash, schema_version, state, created_at | request_id UNIQUE para idempotência |
| schema_migrations | version, applied_at | version PK |

Notas: notas da Unisinos em centésimos (50,450,150,350); somar no código e exigir critérios da rubrica. Pontuação parcial se critério não avaliável. FK com RESTRICT para histórico; CASCADE só para dependentes sem valor próprio, com confirmação quando destrutivo. Índices em attempts(competency via question_id, created_at), review_items(due_date,status), study_tasks(local_date,status), annotations(lesson_id), essay_versions(essay_id,created_at). Usar índices válidos nas colunas reais.

## Migrations e conteúdo
001 schema inicial; 002+ somente incrementais. Seed idempotente pelo ID de catálogo; nunca sobrescrever dados pessoais. Testar banco vazio e upgrade com fixtures de dados pessoais; rollback em falha. Anotações reancoradas por quote/prefix/suffix quando houver mudança; ambiguidade preserva anotação órfã visível. Não adotar FTS até verificar suporte; busca simples parametrizada suficiente.

## Backup
Formato JSON versionado com manifesto, data, schemaVersion, conteúdo/versionamento e coleções exportáveis; hash SHA-256 detecta corrupção, não autentica origem. Exportar snapshot consistente; sem credenciais. Restaurar somente após validar tamanho, schema, relações e compatibilidade. Importação em transação, backup prévio e rollback na falha. Recusar versões futuras não suportadas; nunca limpar banco antes de validar. Testar round-trip e falha simulada. Arquivo contém dados pessoais: avisar antes de exportar e oferecer criptografia em evolução futura.
