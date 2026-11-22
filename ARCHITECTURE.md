# Arquitetura — ADR inicial
## ADR-001: monólito modular no dispositivo
Aceito. Vue 3, TypeScript strict, Vite, Capacitor, Pinia para estado transitório, SQLite via plugin compatível, Zod, TipTap se compatível com seleção mobile. Tailwind opcional; componentes simples antes de bibliotecas pesadas. Vitest e testes Android. Sem NestJS, servidor HTTP ou PostgreSQL. Verificar compatibilidade e fixar versões no lockfile.

## Estrutura
```
android/
public/content/{modules,lessons,questions,repertoire,rubrics}/
src/core/{database,migrations,validation,backup,security,clock}/
src/modules/{learning,annotations,exercises,assessment,study-plan,revision,essays,repertoire,news,ai,settings}/
src/shared/{components,types}/
src/router/
tests/{unit,integration,fixtures}/
docs/adr/
```
Cada módulo possui views/components, services de caso de uso e repositories quando necessário. Views chamam serviços; serviços usam interfaces de persistência; SQL fica nos repositories. Não introduzir camadas vazias por formalidade. Pinia não é fonte de verdade persistente.

## Contratos
ContentRepository, AnnotationRepository, AttemptRepository, EssayRepository, StudyPlanService, ReviewScheduler, NewsSource, BackupService e AIExchange (prepare/export/import) tipados. Futuro AIProvider pode ampliar fluxo sem mudar domínio. Injetar relógio e repositories nos testes. Erros explícitos e mensagens acessíveis.

## Evolução sem perda de dados
IDs estáveis UUID para dados pessoais e IDs estáveis de catálogo; conteúdo com versão e origem. Migrations sequenciais transacionais, nunca apagar banco em upgrade. Separar versão de schema, formato de backup, conteúdo e versão APK. Fixar applicationId próprio, ex. `com.redacaolab.personal`, antes da primeira instalação; registrar certificado de assinatura e manter chave em custódia privada para futuras atualizações. Incrementar versionCode e testar instalação sobre versão anterior. Nunca alterar identidades sem planejamento de migração. Manter ADRs para mudanças importantes.

## Rede
Adaptadores de saída exclusivamente para fontes aprovadas; chamadas HTTPS, timeout, limite de tamanho, cache e cancelamento. ChatGPT externo via share/copy; não embutir login. Aplicação principal usa assets locais, não servidor de desenvolvimento no release.

## Testes e qualidade
Unitários: cálculo de prioridades, revisão, planejamento, rubricas, validação e anchors. Integração: SQLite real, migrations e restauração; teste no Android obrigatório para plugins. Smoke: modo avião, reinício, atualização assinada e compartilhamento. CI opcional apenas código e fixtures sintéticas; sem dados pessoais. Registrar decisões, limitações e evidências no README e docs/adr.

## ADR-002 — identidade e persistência da primeira build

Adotados `com.redacaolab.personal`, versionCode 1, schema SQLite 1 e catálogo 1. O plugin abre o banco no sandbox privado, sem criptografia adicional. O seed grava o catálogo em transação. As views leem o mesmo catálogo validado que alimenta o seed, possibilitando busca offline e prévia de leitura no navegador. A revisão inicial usa o tópico da aula como unidade. O manifesto desta fatia dispensa internet. O certificado público do build debug local está registrado no README.
