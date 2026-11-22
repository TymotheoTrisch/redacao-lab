# Instruções permanentes ao agente Codex
Leia README, PRD, ARCHITECTURE, DATABASE, SECURITY, CONTENT, AI_INTEGRATION e BACKLOG antes de editar. Objetivo: app pessoal Android rápido, evolutivo e seguro. Priorize B01–B04 para primeiro APK.

## Regras não negociáveis
Sem servidor, autenticação, telemetria, sincronização, contas ou portas de escuta no app. Não integrar endpoints privados do ChatGPT ou Professor Redação. Não reproduzir material proprietário sem autorização documentada. Não usar dados pessoais em testes ou Git. Não inventar resultados, fontes ou conteúdo oficial. Não executar alterações destrutivas, instalar software global, criar chaves de release ou publicar remotamente sem aprovação quando necessário.

## Implementação
TypeScript strict, validação nas fronteiras, SQL parametrizado, migrations versionadas, IDs estáveis, repositories simples. Evitar overengineering e dependências desnecessárias. UI em pt-BR, acessível e responsiva; testes de comportamento. Preservar dados em upgrades; sem reset automático. Fixar versões compatíveis com Android. Não alterar applicationId ou assinatura após primeira release. Não criar features fora do backlog sem justificativa.

## Workflow
Inspecionar ambiente e Git; preservar arquivos existentes. Planejar uma etapa curta, implementar, executar verificações, atualizar documentação e evidências. Resolver falhas antes de ampliar escopo. Usar fixtures originais e sintéticas. Se decisão não crítica estiver aberta, escolher default simples e documentar ADR; se envolver custo, privacidade, destruição ou credencial, solicitar aprovação.

## Definition of done
Funcionalidade real, sem placeholders disfarçados; critérios do PRD atendidos, testes relevantes executados, erros tratados, offline preservado, documentação atualizada, artifact path verificável. Informar separadamente o que foi testado no emulador/dispositivo e o que não foi. Não declarar APK pronto se não compilado ou assinado. Ao terminar etapa, informar próximos passos e como instalar. Não iniciar escopo posterior bloqueando entrega inicial.


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


Os arquivos JSON originais do Professor Redação foram extraídos para `reference-private/`.

Leia `CONTENT.md` e analise a estrutura desses arquivos.

Implemente um importador local e opcional para aproveitar os dados como referência pedagógica, preservando os arquivos originais e seus identificadores de origem.

Não envie `reference-private/` ao GitHub, não publique esses conteúdos e não os inclua automaticamente no APK distribuível.

Mantenha a arquitetura de conteúdo independente, permitindo utilizar os módulos próprios do Redação Lab e evoluir futuramente sem depender dos arquivos originais.

Crie testes automatizados para validar a importação, a integridade dos dados e a compatibilidade com o modelo de persistência.

## Regras do leitor no Android
- Tema escuro por padrão, contraste legível e animações breves que respeitam a preferência por movimento reduzido.
- Cada módulo oferece leitura vertical contínua. Perguntas, respostas e explicações ficam intercaladas com o texto associado.
- A seleção de um trecho apresenta cores para grifar imediatamente e uma ação de comentário junto à seleção.
- O botão de notas gerais contém apenas um ícone, com nome acessível, no canto inferior direito. Abre um painel sobre o módulo e conserva a posição de leitura.
- As referências pedagógicas privadas entram por importação local opcional. A distribuição inclui o catálogo autoral.
