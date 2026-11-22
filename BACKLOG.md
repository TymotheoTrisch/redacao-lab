# Backlog executável — alvo de cinco dias, não garantia
Prioridade: entregar builds utilizáveis cedo; não sacrificar integridade dos dados. Cada etapa termina com testes, commit local se autorizado, registro de pendências e instrução de instalação. Não enviar Git remoto sem autorização.

| ID | Etapa / dependência | Entrega e aceite |
|---|---|---|
| B01 | D1 | Preflight Windows/Android, scaffold Vue/Capacitor, lockfile, appId fixo; build debug e instalação se dispositivo disponível |
| B02 | D1 / B01 | SQLite migration 001, seed idempotente, dados persistem após restart |
| B03 | D1 / B02 | Leitor com conteúdo inicial original, navegação, progresso e busca offline |
| B04 | D1–2 / B03 | Anotações por trecho, cores e reforço; testar atualização de conteúdo |
| B05 | D2 / B02 | Exercícios e tentativas, feedback, diagnóstico com evidências |
| B06 | D2 / B05 | Agenda, prioridades, revisão simples e replanejamento preservando concluídas |
| B07 | D3 / B02 | Editor, autosave e versões; estrutura guiada por gênero |
| B08 | D3 / B07 | Rubrica e correção manual, geração/importação de JSON IA, caderno de erros |
| B09 | D3 / B03 | Professor IA assistido; resumo/dúvida e importação de texto |
| B10 | D4 / B02 | Repertório com fontes, tags, busca e ligação a redações |
| B11 | D4 / B10 | RSS/IBGE, cache, links externos; não bloquear offline |
| B12 | D4–5 / B02 | Backup/restauração; testar corrupção, rollback e round-trip |
| B13 | D5 / anteriores | Segurança, acessibilidade, teste real Android, modo avião, upgrade e release assinado |
| B14 | Posterior | Ampliar conteúdo, FSRS, dashboard avançado, imports autorizados, melhoria de design |

## Gates
G1: APK debug com leitor e persistência; G2: estudar e revisar offline; G3: ciclo redação/correção completo; G4: backup comprovado, upgrade sem perda e release. Se ambiente impedir APK, registrar bloqueio e comandos exatos sem fingir sucesso. Se prazo apertar, adiar notícias, dashboard, TipTap sofisticado e conteúdo não prioritário. Não adiar preservação de dados, validação ou segurança básica.

## Evidências
Para cada item: status planejado/em execução/comprovado/bloqueado, arquivos alterados, comandos e resultados, testes faltantes, próximo passo. Rodar lint/typecheck/test/build, verificar APK real; testes de dispositivo não executados ficam pendentes. Nunca substituir testes reais por mocks e declarar validado.


## Política obrigatória de correção de bugs e testes de regressão

Toda correção de bug deve ser acompanhada de um teste de regressão automatizado, sempre que tecnicamente viável.

O fluxo obrigatório é:

1. Investigar a causa raiz do defeito.
2. Criar um teste que reproduza o comportamento incorreto.
3. Confirmar que o teste falha antes da correção.
4. Implementar a menor correção segura possível.
5. Confirmar que o novo teste passa.
6. Executar a suíte de testes relacionada e verificar regressões.
7. Validar manualmente no Android quando o defeito depender de comportamento nativo.
8. Registrar o problema, a causa raiz, a solução e os testes executados.

Regras adicionais:
- Nunca remover ou enfraquecer testes para ocultar falhas.
- Não considerar um bug resolvido sem evidência verificável.
- Preservar permanentemente os testes de regressão criados.
- Priorizar testes de integridade de dados, migrations, persistência e compatibilidade entre versões.
- Quando um teste automatizado não for viável, documentar a justificativa e estabelecer um procedimento de validação reproduzível.
- Toda alteração deve preservar o comportamento anteriormente validado, salvo mudança intencional de requisito.
- Não declarar testes aprovados quando não foram executados.
## Evidências da primeira fatia Android · 22/11/2026

| Etapa | Evidência local |
|---|---|
| B01 | Build debug 0.1.0 produzido no Windows. `apksigner verify` confirmou v1/v2. Identidade, plataforma, certificado, hash e instalação estão no README. |
| B02 | Migration 001, seed transacional, FKs e dados pessoais em SQLite. Testes em banco real de arquivo verificam reabertura, rollback e proteção contra versão incompatível. |
| B03 | Cinco módulos, dez aulas, 25 exercícios com explicação. Busca por conteúdo, conclusão e retomada de bloco. Testes de catálogo e interface executados. |
| B04 | Seleção UTF-16, três cores, edição e exclusão confirmada, reancoragem por contexto e citação órfã visível. Reforço por aula com revisão e reagendamento. |

Instalação limpa de dependências, ESLint, TypeScript strict, 25 testes Vitest, Vite, Capacitor sync, Gradle debug e compilação dos testes instrumentados passaram no Windows. Conferidos os assets embarcados, manifesto mesclado e assinatura. A auditoria npm reportou zero alertas nas dependências de produção e quatro moderados restritos à cadeia de ferramentas de teste.

### Correções verificadas

- O seed permitia alterar blocos com a mesma versão, comprometendo a referência de anotações. Um teste SQLite reproduziu a aceitação indevida. A comparação dos blocos antes da escrita rejeita o pacote inconsistente e preserva a versão e os dados anteriores. Reexecutados o teste específico e a suíte.
- O AndroidX adicionava um receptor de perfil exportado durante a mesclagem do manifesto. O teste do manifesto efetivo falhou com dois componentes exportados. A remoção dirigida do receptor passou na mesma verificação e deixou apenas o launcher exportado.
- O padrão debug do Capacitor incluía argumentos de chamadas SQLite nos logs da ponte. Um teste leu a configuração do APK e falhou com esse padrão. O ajuste explícito de logging passou após gerar novamente o APK. O teste permanente também rejeita URL de servidor remoto.
- A CI tentou compilar a instrumentação das bibliotecas junto com a do app, expondo classes Kotlin duplicadas no módulo gerado Cordova. As tarefas Gradle foram qualificadas com `:app:`. O typecheck também detectou uma asserção de interface usando um método ausente no tipo retornado por `get`. A suíte manteve a asserção usando `find`. As duas verificações fazem parte do fluxo de CI.

O ADB local listou zero aparelhos. Teste físico, ergonomia da seleção por toque, TalkBack e atualização sobre uma versão anterior continuam pendentes. B05 inicia o registro de tentativas com snapshot imutável e diagnóstico pelas últimas 20 respostas por competência.

G1 comprovado. O [teste instrumentado no Android 15](https://github.com/TymotheoTrisch/redacao-lab/actions/runs/45078376270) instalou o APK em emulador limpo, confirmou modo avião ativo, gravou anotação e reforço, encerrou o processo e os recuperou ao retomar o bloco. As interações de seleção foram automatizadas pelo WebView. O APK de referência está preservado em `artifacts/debug/redacao-lab-0.1.0-debug.apk`.
