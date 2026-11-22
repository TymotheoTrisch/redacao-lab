# Conteúdo pedagógico e proveniência
## APK de referência
Inspeção direta do arquivo `Professor Redação_com,professorredacao,app_1,31.apks` confirmou base.apk e três splits (es, pt, xxhdpi), configuração Capacitor com appId com.professorredacao.app, assets/public/assets/conversa/modulo1.json até modulo15.json e quiz/modulo1_quiz.json até modulo15_quiz.json, além de character-chat-messages.json. Confirma presença de conteúdo embarcado; não estabelece licença, API ou autorização. Não copiar código, personagens, áudio ou banco de questões proprietário. Se houver autorização documentada, implementar importador separado e registrar origem/licença; não incluir APK original no repo. A trilha abaixo é proposta própria, não transcrição.

## Trilha inicial
1. Fundamentos da redação
2. Gêneros e tipologias
3. Estrutura textual
4. Interpretação de propostas
5. Tese e posicionamento
6. Argumentação e contrapontos
7. Repertório sociocultural
8. Coesão e coerência
9. Adequação lexical
10. Concordância, regência e crase
11. Pontuação e ortografia
12. Conclusão
13. Revisão e reescrita
14. Redações comentadas
15. Preparação Unisinos

## Contrato de conteúdo
JSON versionado UTF-8: module {id,title,order,version,lessons}; lesson {id,title,competencyIds,blocks,sourceIds}; block {id,kind,text}; question {id,version,competencyId,lessonId,type,prompt,options,answer,explanation,sourceIds}; repertoire {id,title,summary,application,limitations,sourceIds,tags}. Tipos e variantes validados. IDs não dependem de posição. Não inserir HTML arbitrário.

## Entrega incremental
Primeira build: aulas completas e questões originais em interpretação, tese, argumentação, concordância e coesão; pelo menos 2 aulas e 5 exercícios por eixo inicial. Demais módulos podem aparecer como planejados claramente, não como conteúdo concluído. Expandir para 15 módulos com revisão pedagógica. Exercícios devem explicar erros, sem ambiguidade; questões abertas usam autoavaliação ou feedback assistido, não pontuação inventada. Separar fixtures de produção.

## Fontes e atualidades
Começar com RSS Agência Brasil (descobrir endpoint oficial), API IBGE e GDELT opcional. Validar documentação, disponibilidade, licença e limites antes de integrar. Guardar título, fonte, URL, data, resumo permitido; abrir artigo original; não contornar paywall. Repertório inclui contexto, evidência, limitações e possíveis argumentos. Não inventar citações, estatísticas ou critérios oficiais. Registrar data de consulta e status verificado/não verificado. Rubricas por edição; conferir edital Unisinos 2027/1.


## Importação opcional no aparelho

O usuário seleciona pares dos arquivos de conversa e quiz e confirma a prévia. O app valida nomes, tamanhos, estruturas e vínculos antes de inserir em transação. O identificador de módulo da fonte e os IDs das conversas são preservados no namespace privado. Itens de quiz sem identificador usam o hash do enunciado. Os arquivos de origem têm sequências independentes. A conversão distribui os exercícios ao longo da leitura preservando a ordem de cada sequência e desdobra associações em escolhas por par. Um pacote divergente com a mesma identidade requer tratamento explícito. A versão distribuída e os testes versionados contêm apenas material autoral e fixtures sintéticas.
