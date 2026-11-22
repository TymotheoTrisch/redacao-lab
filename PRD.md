# PRD — Produto e requisitos
## Objetivo
Ajudar o estudante a aprender, escrever, revisar e desenvolver repertório até a prova, preservando seu acervo pessoal para evolução futura. Sucesso: conseguir estudar em modo avião, acompanhar dificuldades e completar um ciclo de redação corrigida.

## Requisitos P0
| ID | Requisito | Critério de aceite |
|---|---|---|
| R01 | Configuração pessoal | Informar data da prova, minutos/dia, dias disponíveis; editar sem perder histórico |
| R02 | Leitor | Navegar em módulos/aulas, retomar leitura, pesquisar conteúdo offline |
| R03 | Anotações | Marcar trecho por cor, comentar, editar, excluir e listar por aula; persistir após reinício |
| R04 | Reforço | Marcar tópico, registrar revisão e reagendar |
| R05 | Treino | Questões por competência, feedback explicado, histórico de tentativas e erros |
| R06 | Diagnóstico | Mostrar domínio estimado e quantidade de evidências; distinguir desconhecido de baixo domínio |
| R07 | Plano | Distribuir atividades até a prova; respeitar dias livres, orçamento diário e replanejar pendências |
| R08 | Redações | Tema, gênero, interpretação, tese, argumentos, rascunho, autosave e versões |
| R09 | Correção | Gerar prompt, importar JSON validado, exibir notas por critério, erros e recomendações; edição manual possível |
| R10 | Professor IA | Gerar prompts de dúvidas, resumo, exemplos e exercícios; importar resposta e manter conversa local |
| R11 | Repertório | Criar, pesquisar e relacionar referências, dados, argumentos e contrapontos com fonte |
| R12 | Backup | Exportar dados e restaurar após validação; confirmar substituição e preservar cópia anterior |

## P1
R13 Atualidades: RSS/API pública, cache offline, filtros, favoritos, fontes e links originais. R14 Dashboard de evolução: série por critério e competências, sem comparar rubricas incompatíveis. R15 melhorar revisão espaçada, importação de exercícios e repertórios.

## Fluxo principal
Configurar objetivo → diagnóstico curto → plano diário → ler/aula → anotar → treinar → revisar → escrever → corrigir → recalcular prioridades. Permitir pular diagnóstico, estudar livremente e ajustar plano.

## Rubrica inicial
Unisinos 2027/1 conforme critérios informados pelo estudante: apresentação 0,5; argumentação e textualidade 4,5; adequação lexical 1,5; adequação gramatical 3,5. Total 10. Verificar edital oficial antes de rotular como rubrica oficial validada. Para texto digitado não inferir linhas manuscritas; sinalizar aspectos não avaliáveis. Gênero deve ser configurável; não impor intervenção do ENEM. Nota de IA é estimativa.

## Algoritmos MVP
Domínio por competência: acertos/total nas últimas 20 tentativas, evidência insuficiente se menos de 5; sem tentativa = desconhecido. Prioridade inicial 0,4 taxa de erros + 0,25 deficiência de domínio + 0,2 revisão vencida normalizada + 0,15 relevância curricular; quando faltarem evidências, agendar diagnóstico em vez de inventar nota. Esses pesos são heurística ajustável, não medida científica. Revisão inicial: intervalos 1, 3, 7, 14 dias após sucesso, erro retorna a 1 dia; permitir adiar. FSRS posterior. Plano reserva tempo para redação, teoria, treino e revisão, ajustando à data e disponibilidade; não criar tarefas após a prova.

## UX e não funcionais
Português brasileiro, layout mobile-first, tema claro/escuro, fontes legíveis, seleção de texto real, acessibilidade por TalkBack, estados vazio/erro/offline, sem botões fictícios. Sem perda de dados após fechar app. Operações locais sem rede. Data e fuso locais para agenda; timestamps UTC no banco. Requisitos de segurança em SECURITY.md.

## Fora do escopo
Login, backend, multiusuário, sincronização, anúncios, gamificação avançada, OCR, grafo, chat automatizado sem API autorizada. Nenhuma integração privada com Professor Redação.
