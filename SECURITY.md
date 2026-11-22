# Segurança e privacidade
## Modelo de ameaças
Ativos: redações, anotações, histórico, chave de assinatura. Ameaças: dispositivo perdido/desbloqueado, dependência maliciosa, XSS via notícia/IA, arquivo importado adulterado, exposição em logs e backups. Local reduz exposição, não elimina risco.

## Controles obrigatórios
- Sandbox privado Android; sem armazenamento compartilhado salvo exportação deliberada via seletor de arquivos; bloqueio de tela do sistema. Sem login próprio.
- Sem serviços de escuta, analytics, anúncios, telemetria, push remoto ou permissões não justificadas. INTERNET apenas para fontes externas; declarar componentes não exportados salvo launcher e integração de compartilhamento estritamente necessária.
- HTTPS; cleartext desabilitado no release; sem bypass TLS. Allowlist de origens para fetch; validar redirects, tipo, tamanho e tempo limite. Links externos via navegador, não WebView com bridge nativa.
- Bundle local; sem live reload, URL remota ou debugging no release. CSP restritiva compatível com Capacitor. Nunca renderizar HTML não confiável via v-html; sanitizar conteúdo rico por allowlist, excluir scripts, eventos, iframes e URLs javascript. Tratar IA e RSS como dados, nunca instruções executáveis.
- Validar importações com Zod, limites de tamanho/profundidade, tipos e referências; queries parametrizadas. Evitar zip traversal se houver ZIP. Não executar conteúdo importado.
- Sem cookies/token do ChatGPT, scraping de sessão, automação de login ou chaves embutidas. Envio à IA somente após preview e confirmação; avisar que conteúdo sai do dispositivo. Não enviar notas ou histórico completos por padrão.
- Desabilitar backup automático em nuvem e revisar regras Android de extração/transferência; comportamento pode variar por fabricante. Backup manual explícito. Não prometer criptografia do SQLite sem implementação verificada.
- Release assinado, debuggable=false, chave fora do repo com backup seguro. Dependências fixadas, auditoria e revisão de permissões/manifesto; não atualizar cegamente. Logs sem conteúdo pessoal ou secrets.

## Aceite
Inspecionar manifesto release, permissões, configuração WebView e tráfego em modo avião; testar imports inválidos, SQL injection, XSS e falha de rede. Registrar testes executados e riscos remanescentes. Não prometer segurança absoluta. Nenhuma mudança de política de rede ou coleta sem decisão explícita do proprietário.
