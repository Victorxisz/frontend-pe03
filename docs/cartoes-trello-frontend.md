# Cartões Trello para implementar o frontend

Base conferida em 01/11/2026. São 21 cartões, um por caso de uso de UC-01 a UC-21, com os nomes preservados. As descrições são destinadas à implementação posterior em React integrado ao Flask. Nenhuma funcionalidade foi implementada nesta tarefa.

## Perguntas, respostas e bloqueios

As três perguntas feitas nesta elaboração foram respondidas pelo usuário em 01/11/2026:

1. **Retirar trabalhador de uma obra:** limpar a atribuição nas ocorrências afetadas, preservando o responsável anterior e o histórico. **Requisito confirmado nesta conversa.** O código local em `app/trabalhadores/repository.py::atualizar` e os testes `tests/trabalhadores/test_responsaveis.py` ainda mantêm a atribuição. A matriz de rastreabilidade afirma que a limpeza foi corrigida, mas essa afirmação não corresponde ao código consultado. **UC-20 depende de correção do backend; UC-14/15 devem refletir a resposta real e não simular a limpeza.**
2. **Excluir cadastro do trabalhador:** preservar ocorrências, limpar `responsavel_id` e guardar `responsavel_anterior`. **Requisito confirmado nesta conversa e comportamento já implementado.** P-10 e outros trechos que ainda o apresentam como proposta precisam ser reconciliados no backend. A implementação consultada também não incrementa a versão da ocorrência ao limpar a atribuição, ao contrário do relatório da matriz; revisar a concorrência antes de fechar esse trecho de UC-20.
3. **Cloudinary:** o usuário confirmou a aprovação pelo professor. Não há mais bloqueio de aceite acadêmico dessa escolha. **Permanece a validação técnica real**, incluindo upload/recuperação dos três tipos, configuração privada e operação dentro do uso gratuito previsto. Os testes com mídia simulada não comprovam isso.

Não há pergunta de negócio aguardando resposta nesta versão. Os bloqueios remanescentes são técnicos ou de evidência. Se surgir outra divergência durante a implementação, perguntar antes de fechar a parte afetada.

## Fontes e situação atual

- Modelo de descrição: [cartões do backend](../../programacao-eficaz-projeto3/docs/12-cartoes-trello-finalizacao.md).
- Identificadores e cobertura: [casos de uso](../../programacao-eficaz-projeto3/docs/08-casos-de-uso-mvp.md), [casos de teste](../../programacao-eficaz-projeto3/docs/09-casos-de-teste-mvp.md) e [matriz de rastreabilidade](../../programacao-eficaz-projeto3/docs/10-matriz-de-rastreabilidade.md).
- Negócio: [escopo](../../programacao-eficaz-projeto3/docs/01-visao-e-escopo.md), [regras](../../programacao-eficaz-projeto3/docs/02-dominio-e-regras.md), [funcionalidades](../../programacao-eficaz-projeto3/docs/03-funcionalidades.md), [aceite](../../programacao-eficaz-projeto3/docs/04-jornadas-e-aceite.md) e [decisões](../../programacao-eficaz-projeto3/docs/07-plano-e-decisoes.md).
- HTTP: [README do backend](../../programacao-eficaz-projeto3/README.md), [contratos](../../programacao-eficaz-projeto3/docs/05-arquitetura-e-contratos.md), rotas, serviços, validações e testes citados em cada cartão. [Modelo POO](../../programacao-eficaz-projeto3/docs/13-modelo-poo.md) e [limites dos testes](../../programacao-eficaz-projeto3/tests/README.md) complementam a leitura.
- Frontend: [README](../README.md), `src/`, `package.json` e `tests/http.test.js`. Login, restauração, logout, cliente HTTP, proteção de rotas e listagem básica de obras existem. As outras páginas são estruturas “Em preparação”. O cabeçalho de obra ainda não consulta seus dados.
- Conversas consultadas: “Planejar sistema para construção” (decisões de escopo), “Revisar diagrama de classes” (confirmações de 30/10), “Reestruturar cartões do Trello” (modelo) e “Associar frontend ao projeto PE03” (arquitetura e estrutura inicial). Foi lido o conteúdo relevante desses chats, sem presumir acesso a discussões externas da equipe.

O backend consultado está no commit `3e965c5` e tinha árvore de trabalho limpa. O frontend contém arquivos locais ainda não commitados; eles são a base existente a preservar. Esta elaboração não executou suites nem declarou novos resultados de teste. A matriz registra verificações anteriores de API/Atlas, mas explicita que Cloudinary real e React/EC2 não foram comprovados naquela revisão; a divergência de trabalhadores acima limita também o uso desse relatório como prova do código atual.

**Distinções para todos os cartões:** “Confirmado” indica escopo/regra aprovada; “Backend” descreve o contrato observado; “Proposta de interface” e todos os arquivos novos são sugestões de implementação, não decisões de tela atribuídas ao grupo. As rotas React existentes são reaproveitáveis, mas não comprovam fluxos integrados.

## Convenções de implementação e aceite

- Os caminhos de frontend são relativos à raiz deste repositório. Caminhos de evidência que começam por `app/`, `tests/` do backend, `construtora.py` ou `trabalhadores.py` pertencem a `../programacao-eficaz-projeto3`. Arquivos novos são identificados como **proposta**; não criá-los apenas para cumprir uma lista se o código compartilhado já resolver o caso.
- Métodos e rotas HTTP abaixo são do Flask, sem `/api`. O cliente atual acrescenta `/api` e o proxy de desenvolvimento remove esse prefixo. Não confundir `Location`/`consulta`/`comparacao` da API com endereços de navegação React. Em produção, configurar proxy e fallback das rotas React conforme o README; testar acesso direto e recarga no EC2.
- Autenticação, autorização, autoria, auditoria, versões e integridade pertencem ao servidor. Formulários enviam somente os campos permitidos. IDs são opacos; não fabricar ID, autor, sucesso, histórico ou data de conclusão no navegador.
- Toda consulta tem carregamento, vazio quando aplicável, erro e nova tentativa. Toda escrita tem envio em andamento, prevenção de duplo clique, erro compreensível e atualização por resposta/reconsulta confirmada. Em falha, preservar o que foi digitado quando ainda válido; em cancelamento anterior ao envio, não gravar. Cancelar um fetch já enviado não significa desfazer a operação no servidor.
- Tratar `401` pelo acesso de UC-01; distinguir `400` de ID inválido, `404` de ausência, validação `422`, conflitos `409` e indisponibilidade. Os formatos variam entre `mensagem`, `erro`, `campos` e `codigo`; não assumir um único envelope. Ler o erro de negócio antes de decidir por nova consulta, confirmação ou retry. Não repetir automaticamente uma escrita não idempotente após timeout.
- Datas de negócio em `AAAA-MM-DD` devem continuar no mesmo dia ao apresentar/enviar. Instantes de auditoria são retornados pelo servidor e devem ser exibidos com fuso identificado. `data_cadastro` de trabalhador usa data HTTP, não o mesmo formato de todas as outras entidades.
- Sessão e respostas reais devem ser exercitadas no navegador. Mocks servem para cenários controlados, mas não encerram cartões integrados. Para fluxos persistentes, reabrir após recarga e reinício do servidor. Outro integrante revisa e registra ambiente, cenário, resultado e limitações. CT-111 é verificado ao longo dos cartões e ao final no EC2, sem criar um 22º cartão técnico.
- Os cenários **FE-UC-XX** são sugestões novas desta elaboração: não são CTs oficiais nem testes já implementados/executados. Proposta de automação: `tests/e2e/uc-XX.spec.js`, um arquivo por UC, com infraestrutura a definir em UC-01. O comando atual `npm test` só cobre `tests/*.test.js` e não executa esses arquivos de navegador automaticamente.

## Recursos compartilhados e primeiro responsável

| Recurso | Implementar primeiro | Reutilização |
| --- | --- | --- |
| Sessão, erros HTTP e base de verificação no navegador | UC-01, complementando a base existente | Todos |
| Campos de prazo e apresentação de datas | UC-02 | UC-03, UC-04 quando descritivo, UC-05 para datas, UC-12 |
| Consulta/contexto de obra e cabeçalho com dados reais | UC-03 | Todos os fluxos dentro da obra |
| Consultas de marco e seleção de marco da obra | UC-05 | UC-06/07/08/12/14/21 |
| Confirmação acessível com cancelar/Escape | UC-06 | UC-07/09/10/16/17/18/20 |
| Comando versionado de mudança, aviso de dependências e leitor básico de histórico | UC-07 | UC-12 amplia campos; UC-13 amplia apresentação |
| Envio de mídia, abertura autenticada e formulário de avanço | UC-08 | UC-09/10/11/14/21 |
| Exclusão com estados pendentes e retomada | UC-09 | UC-17/18 adaptam seus próprios contratos |
| Consulta/comparação de versões | UC-11 | UC-13/21 |
| Formulário, detalhe e consulta de ocorrência | UC-14 | UC-15/16/18 |
| Formulário e consultas de trabalhador | UC-19 | UC-20; seleção de responsável em UC-14/15 |

## [Frontend][UC-01] Entrar e sair da conta da construtora

**1. Contexto e cobertura**

Confirmado: permitir acesso à única conta funcional e saída efetiva, sem login de trabalhador, comprador ou engenheiro. Cobre **F-01, RN-10, CA-01**. Backend: JWT, sessão persistida e revogação no logout. Frontend: fluxo básico já existe; completar e verificar, sem recriar autenticação.

**2. Arquivos previstos**

- Existentes: `src/features/auth/{AuthProvider,LoginPage,RequireAuth}.jsx`, `src/features/auth/api.js`, `src/shared/api/http.js`, `src/app/layouts/AppLayout.jsx`, `src/app/routes.jsx`, `tests/http.test.js`, `package.json`, `vite.config.js` e `README.md`.
- Proposta: infraestrutura de testes de navegador e `tests/e2e/uc-01.spec.js`. Os demais cartões acrescentam somente seus cenários.

**3. Fazer**

- Reutilizar `POST /construtora/login/` com `{email, senha}`, resposta com `access_token`, `refresh_token` e `construtora`; restaurar com `GET /sessoes/atual`; sair com `POST /construtora/logout/`, autenticado. Não trocar por rotas do planejamento antigo sem necessidade.
- Mostrar envio, credencial inválida com mensagem neutra, falha de rede e restauração em andamento. Preservar o destino protegido ao redirecionar para login. Não mostrar conteúdo de negócio durante a restauração.
- Manter o token de acesso em memória/`sessionStorage`, como já implementado, e não persistir senha. Expiração exige novo login, conforme UC-01; refresh automático não é requisito deste cartão, embora `POST /construtora/refresh/` exista no servidor.
- No logout, aguardar revogação; falha não pode ser anunciada como saída confirmada. Em `401` autenticado, encerrar sessão local e orientar novo login. Limpar dados protegidos exibidos, inclusive ao voltar pelo navegador.
- Preservar `ApiError.status` e `.data`; preparar tratamento de campos/códigos sem perder envelopes diferentes. Extensões posteriores de Blob/status devem ser compatíveis com os consumidores atuais.
- Preparar execução integrada de testes de navegador, preservando os quatro testes HTTP existentes. Documentar proxy em desenvolvimento e produção, fallback React e configuração pública da URL; a conta e os segredos são provisionados no servidor.

**4. Pronto quando**

A conta real de teste entra, restaura após recarga, abre a rota solicitada e sai. Senha errada, token vencido e acesso direto sem sessão têm tratamento visível. Após logout, uma chamada autenticada com o token antigo é recusada pela API. Falha no logout não mostra confirmação falsa. O fluxo funciona no endereço integrado, sem senha/chaves no bundle.

**5. Testes relacionados**

CT-01 a CT-04; CT-111 para acesso implantado. Evidências: backend `tests/autenticacao/`, `tests/infraestrutura/test_rotas_api.py`; frontend `tests/http.test.js`. **FE-UC-01 proposto:** recarga de rota aninhada, retorno ao destino, falha de restauração/logout e retorno pelo histórico do navegador.

**6. Dependências**

Conta de demonstração configurada com `CONSTRUTORA_ID`, Flask acessível e proxy/CORS adequados. Todos os demais UCs reutilizam esta sessão; ocultar um botão não substitui autorização no backend.

## [Frontend][UC-02] Criar obra residencial

**1. Contexto e cobertura**

Confirmado: cadastrar casa ou apartamentos, com um cliente de referência e entrega exata ou estimada. Cobre **F-02, RN-01, CA-02**. Backend implementado; `NovaObraPage` ainda é estrutura. Proposta de interface: formulário na rota `/obras/nova`, com escolha explícita da modalidade e revisão antes de salvar.

**2. Arquivos previstos**

- Existentes: `src/features/obras/pages/NovaObraPage.jsx`, `src/features/obras/api.js`, `src/features/obras/routes.jsx`, `src/shared/ui/UI.jsx`.
- Proposta: `src/features/obras/components/PrazoEntregaFields.jsx`, `src/shared/lib/datas.js` e `tests/e2e/uc-02.spec.js`.

**3. Fazer**

- Solicitar `nome`, `tipo` (`casa`/`apartamentos`), `cliente`, `localizacao`, `descricao`, `inicio` e `entrega`. `localizacao` é texto no contrato atual: não criar payload de endereço estruturado nem cadastro de comprador.
- Enviar `POST /obras` com `entrega: {modalidade: "data_exata", data}` ou `{modalidade: "intervalo_estimado", inicio, fim}`. Limpar os campos incompatíveis ao alternar modalidade. Validar textos preenchidos, dias existentes e fim maior ou igual ao início; não acrescentar restrições de calendário ausentes do contrato.
- Não enviar `estado`, `autor`, `data_registro`, `data_conclusao`, `critica` ou `atrasada`. O servidor define o estado inicial e os dados de auditoria.
- Mostrar salvamento e impedir duplicação por clique. `201` contém `id`, cadastro e `Location`; abrir a área da obra usando o ID e consultar o detalhe por UC-03. Atualizar a listagem ao voltar. Cancelar antes de salvar retorna à lista sem POST.
- Tratar `422` com `mensagem`/`campos`, `500` de persistência e falha de conexão. Em resposta perdida, orientar consulta da lista antes de repetir: este POST não tem contrato de idempotência. Não gerar obra temporária apresentada como salva.

**4. Pronto quando**

Casa com data exata e apartamentos com intervalo válido são criados, apresentados e recuperados após recarga/reinício. Alternar modalidade não envia os dois formatos. Intervalo de um dia funciona; texto vazio, data inválida e intervalo invertido não criam obra. Cancelamento e falha preservam o estado coerente da lista.

**5. Testes relacionados**

CT-05 a CT-10; CT-111. Backend: `tests/obras/test_cadastro.py`, `test_validacoes_cadastro.py`, `test_cadastro_atlas.py`. **FE-UC-02 proposto:** alternância repetida de modalidade, dia sem deslocamento por fuso, resposta perdida sem retry automático. CT-107/108 só se ViaCEP for aprovada posteriormente; não incluí-la agora.

**6. Dependências**

UC-01 e consulta de detalhe de UC-03. UC-02 cria primeiro o seletor de prazo, reutilizado em UC-12. Não depende de uma API de CEP: Cloudinary aprovada atende à escolha externa atual e localização manual permanece disponível.

## [Frontend][UC-03] Listar, filtrar e consultar obras

**1. Contexto e cobertura**

Confirmado: localizar obras e separar ciclo de vida de atraso. Cobre **F-03, F-04, RN-02, CA-02**. A lista básica já usa a API; faltam filtros, informações completas e detalhe no contexto da obra. Proposta: aproveitar `ObraLayout` como resumo da obra, mantendo as abas existentes.

**2. Arquivos previstos**

- Existentes: `src/features/obras/pages/ObrasPage.jsx`, `src/features/obras/api.js`, `src/app/layouts/ObraLayout.jsx`, `src/features/obras/routes.jsx`.
- Proposta: `src/features/obras/components/FiltrosObras.jsx`, `src/features/obras/ObraContext.jsx` se necessário para compartilhar a consulta, e `tests/e2e/uc-03.spec.js`. Reutilizar datas de UC-02.

**3. Fazer**

- Ampliar `GET /obras` com `nome`, `cliente`, `estado`, `alerta=atrasada`, `entregaDe`, `entregaAte`, `registroDe`, `registroAte`. Enviar cada filtro uma única vez; omitir os vazios, inclusive `alerta`. Permitir limpar filtros.
- Apresentar resultados de `{obras, situacao, filtros_aplicados}`. Distinguir nenhuma obra de nenhum resultado. Busca textual é parcial literal, filtros combinam por interseção e datas têm limites inclusivos; não reinterpretar os resultados no navegador.
- Mostrar nome, cliente, modalidade/prazo, estado e `alertas` retornados. Estados: `planejada`, `em andamento`, `concluída`, `suspensa`. `atrasada` é indicador separado e não editável; obra concluída usa a conclusão do servidor. Não calcular criticidade nem percentual de avanço.
- Buscar `GET /obras/{id}` no contexto de detalhe e apresentar nome, localização, descrição, início, prazo e conclusão quando existente, substituindo o cabeçalho genérico. Manter navegação para as áreas de cada UC.
- Em mudanças rápidas de filtro/obra, cancelar ou ignorar respostas antigas para não misturar dados. Proposta: guardar filtros na URL para permitir retorno à busca.
- Tratar `422` de filtros inválidos/repetidos, `400`, `404` e `500`. Erro não é lista vazia; obra ausente não pode manter cabeçalho da obra anterior.

**4. Pronto quando**

Filtros isolados e combinados retornam os mesmos dados da API. Estado e atraso aparecem juntos quando cabível; o dia limite não é exibido como atraso por cálculo local. Limpar, voltar e recarregar preservam uma busca compreensível. Detalhe inexistente e resposta lenta de outra obra não exibem contexto incorreto.

**5. Testes relacionados**

CT-11 a CT-15; CT-111. Backend: `tests/obras/test_consultas.py`, `test_filtro_alertas.py`, `tests/mudancas/test_mudancas.py`. **FE-UC-03 proposto:** duas consultas fora de ordem, filtro alerta com estado, filtros vazios omitidos e navegação de volta à busca.

**6. Dependências**

UC-01; UC-02 ou dados persistidos para os cenários. Esta consulta/contexto é a base dos demais cartões de obra. Alertas e conclusão dependem exclusivamente dos campos retornados pelo backend; não inventar conclusão para registros legados.

## [Frontend][UC-04] Editar dados descritivos da obra

**1. Contexto e cobertura**

Confirmado: corrigir cadastro sem contornar motivo/histórico de replanejamento. Cobre **F-05, CA-02**, respeitando RN-07. Backend implementado. Proposta: formulário na rota de edição existente, com ligação explícita ao fluxo UC-12 para prazo/situação.

**2. Arquivos previstos**

- Existentes: `src/features/obras/pages/EditarObraPage.jsx`, `src/features/obras/api.js`, `src/app/layouts/ObraLayout.jsx` e componentes visuais compartilhados.
- Proposta: extrair `src/features/obras/components/ObraDescritivaFields.jsx` para compartilhar os quatro campos com UC-02; `tests/e2e/uc-04.spec.js`.

**3. Fazer**

- Carregar `GET /obras/{id}` antes da edição. Permitir somente `nome`, `descricao`, `localizacao` e `cliente`; não tornar `tipo`, `inicio`, prazo, estado ou conclusão editáveis por este comando.
- Enviar somente campos alterados em `PATCH /obras/{id}`. Validar textos preenchidos. Cancelar volta ao detalhe sem PATCH; ausência de mudanças não precisa gerar envio.
- Tratar o `200`, que contém `id` e dados descritivos, como resposta parcial: não substituir o objeto inteiro e perder prazo/alertas. Reconsultar detalhe/lista para atualizar o nome em toda a navegação.
- Exibir carregamento, indisponibilidade do registro e erro de campo. `422` rejeita campos indevidos, inclusive tentativa de mudar prazo; `400`/`404` e `500` têm mensagens próprias. Durante falha, manter os dados digitados sem anunciar sucesso.

**4. Pronto quando**

Editar cada campo muda o cadastro persistido e atualiza cabeçalho/lista após retorno. Prazo, estado, autoria e conclusão permanecem íntegros. Cancelar não grava; erro não troca o detalhe por um cadastro incompleto. Mudança de prazo é acessível por UC-12, com motivo.

**5. Testes relacionados**

CT-16 e CT-17. Backend: `tests/obras/test_edicao.py`, `test_edicao_atlas.py`. **FE-UC-04 proposto:** resposta parcial preserva informações, cancelamento e redirecionamento para mudança controlada.

**6. Dependências**

UC-03 para carregar/atualizar a obra; UC-12 para concluir o caminho de replanejamento. Não exigir UC-12 para entregar a edição descritiva isolada.

## [Frontend][UC-05] Criar e consultar marco

**1. Contexto e cobertura**

Confirmado: organizar entregas diretamente na obra, sem entidade “etapa”. Cobre **F-06, RN-03, CA-03**. Cadastro e consultas do backend existem. Proposta: preencher as páginas já roteadas de lista, criação e detalhe.

**2. Arquivos previstos**

- Existentes: `src/features/marcos/pages/{MarcosPage,NovoMarcoPage,MarcoPage}.jsx`, `src/features/marcos/routes.jsx` e `src/shared/ui/UI.jsx`.
- Proposta: `src/features/marcos/api.js`, `src/features/marcos/components/MarcoSelect.jsx`, `tests/e2e/uc-05.spec.js`. Reutilizar datas e contexto da obra.

**3. Fazer**

- Consultar `GET /obras/{obraId}/marcos`, cuja resposta é um **array**, e `GET /obras/{obraId}/marcos/{marcoId}` para detalhe. Não inventar `GET /marcos/{id}` nem envelope `{marcos}`.
- Enviar `POST /obras/{obraId}/marcos` com `nome`, `descricao`, `inicio_previsto` e `fim_previsto`; textos preenchidos, datas válidas e fim maior ou igual ao início. Estado inicial `a iniciar` vem do servidor.
- Após `201`, abrir detalhe pelo ID retornado e reconsultar a lista. O detalhe deve apresentar período, estado, descrição e links de dependências/avanços; guardar `versao` retornada para comandos que a exigirem, sem enviá-la no cadastro.
- Mostrar carregamento, nenhum marco, erro e nova tentativa. Tratar `422` de campos, `400` de ID, `404` de obra/marco ou marco fora da obra e `500` de banco. Cancelar criação não envia POST. Não inferir progresso por quantidade de marcos.

**4. Pronto quando**

Marco válido nasce `a iniciar`, aparece na obra correta e pode ser consultado após recarga/reinício. Período invertido não salva. Trocar `obraId` na URL não apresenta marco de outra obra. Lista vazia e falha de consulta são diferentes.

**5. Testes relacionados**

CT-18 a CT-21; CT-111. Backend: `tests/marcos/test_cadastro.py`, `test_consultas.py`. **FE-UC-05 proposto:** array de listagem, acesso direto ao detalhe, cancelamento e navegação rápida entre obras.

**6. Dependências**

UC-01/03 e obra persistida por UC-02. UC-05 implementa consultas e seleção de marco para UC-06/07/08/12/14/21. Detalhe completo incorpora ações dos cartões correspondentes conforme forem entregues.

## [Frontend][UC-06] Definir ou retirar dependência entre marcos

**1. Contexto e cobertura**

Confirmado: mostrar “A depende de B”, permitindo retirada e impedindo vínculos inválidos. Cobre **F-07, RN-04, CA-03**. Backend implementado. Proposta: lista de dependências e seletor na página já existente.

**2. Arquivos previstos**

- Existentes: `src/features/marcos/pages/DependenciasPage.jsx`, `src/features/marcos/pages/MarcoPage.jsx` e rotas do módulo.
- Reutilizar `src/features/marcos/api.js`/`MarcoSelect.jsx` de UC-05.
- Proposta: `src/shared/ui/ConfirmDialog.jsx` e `tests/e2e/uc-06.spec.js`.

**3. Fazer**

- Buscar candidatos pela lista da própria obra e dependências por `GET /marcos/{marcoId}/dependencias` (array). Exibir `depende_de_nome` e direção da relação, não apenas IDs.
- Enviar `POST /marcos/{marcoId}/dependencias` com `{depende_de_id}`; `201` retorna o vínculo com `id`, `marco_id`, `depende_de_id`, `marco_nome`, `depende_de_nome`.
- Excluir usando o **ID do vínculo**, em `DELETE /marcos/{marcoId}/dependencias/{dependenciaId}`. Confirmar mostrando os dois marcos; cancelar/Escape não envia DELETE. `204` permite reconsultar e remover o vínculo exibido.
- Filtrar o próprio marco e vínculos já escolhidos para ajudar o usuário, mantendo os erros reais do servidor para ciclo, autorreferência, duplicação, outra obra e concorrência (`409`). Tratar também `400`, `404`, `422`, falha de banco e lista sem candidatos.
- Criar confirmação reutilizável com foco no diálogo, botões claros, cancelamento por teclado e devolução do foco ao acionador. Não implementar grafo de regras de negócio no navegador.

**4. Pronto quando**

Relação criada/recarregada aparece com nomes e direção correta. Retirar uma dependência não exclui nenhum marco. Cancelar mantém tudo. Ciclo direto/indireto e vínculo alheio são recusados com mensagem compreensível; não ficam desenhados como salvos.

**5. Testes relacionados**

CT-22 a CT-25. Backend: `tests/marcos/test_dependencias.py`. **FE-UC-06 proposto:** diferença entre ID do vínculo e do marco, foco/Escape e recarga após conflito.

**6. Dependências**

UC-05 e pelo menos dois marcos para a criação. UC-07 reutiliza os nomes e a confirmação, sem duplicar esta manutenção de vínculos. O `Location` da criação não implica uma rota GET individual de dependência; usar a listagem implementada.

## [Frontend][UC-07] Alterar estado do marco e reabri-lo

**1. Contexto e cobertura**

Confirmado: mudar estado com motivo; dependência pendente avisa e permite prosseguir conscientemente. Cobre **F-07, F-12, RN-04, RN-07, CA-03, CA-06**. Proposta: ação no detalhe do marco com motivo e confirmação específica quando necessária.

**2. Arquivos previstos**

- Existentes: `src/features/marcos/pages/MarcoPage.jsx`.
- Reutilizar API/contexto de UC-05 e `ConfirmDialog` de UC-06.
- Proposta: `src/features/marcos/components/EstadoMarcoForm.jsx`, `src/features/historico/api.js` e `tests/e2e/uc-07.spec.js`. UC-12/13 reutilizam esse cliente de mudanças/histórico.

**3. Fazer**

- Carregar o detalhe e permitir `a iniciar`, `em andamento`, `concluído`, inclusive reabertura, exigindo motivo.
- Proposta técnica: usar `POST /obras/{obraId}/mudancas` com `{alvo:{tipo:"marco",id:marcoId},campo:"estado",novo_valor,motivo,versao}`. Isso preserva a versão lida no formulário e será reaproveitado por UC-12.
- O backend também oferece `PATCH /marcos/{id}` com `{estado,motivo,confirmar_dependencias?}`, mas esse PATCH não aceita `versao` no corpo. Não misturar os dois payloads nem enviar duas escritas para a mesma decisão.
- No `409` com `codigo: DEPENDENCIAS_PENDENTES`, exibir `dependencias` com nome/estado. Cancelar mantém o estado e não reenvia. Prosseguir explicitamente reenvia o comando com `confirmar_dependencias:true`; nunca confirmar automaticamente todo `409`.
- Outros conflitos, inclusive `DEPENDENCIA_INCONSISTENTE`, exigem mensagem e nova consulta, sem contornar o servidor. Conflito de versão exige revisar novamente a decisão.
- Após `200`, reconsultar detalhe/lista e `GET /obras/{obraId}/mudancas` para apresentar a decisão persistida ou sua ligação ao histórico. Tratar motivo vazio/estado inválido (`422`), alvo ausente (`404`) e falha (`500`) sem trocar o estado local por sucesso presumido.

**4. Pronto quando**

Conclusão/reabertura ficam persistidas com motivo e histórico. O aviso identifica o pré-requisito; cancelar preserva o estado e confirmar permite concluir. O caminho de mudança não ignora dependências nem sobrescreve versão obsoleta silenciosamente. Falha não mostra evento inventado.

**5. Testes relacionados**

CT-26 a CT-30. Backend: `tests/marcos/test_estado.py`, `tests/mudancas/test_mudancas.py`. **FE-UC-07 proposto:** distinguir confirmação de dependência de outros `409`, duplo clique e revalidação após atualização em outra aba.

**6. Dependências**

UC-05/06. Este cartão introduz o comando e a leitura mínima compartilhados; UC-12 amplia tipos de mudança, UC-13 entrega navegação/comparação completas. A gravação atômica e a consulta renovada de dependências são responsabilidades do backend.

## [Frontend][UC-08] Registrar avanço com mídia como rascunho

**1. Contexto e cobertura**

Confirmado: registrar evidência de trabalho em um marco, sem obrigação diária, inicialmente como rascunho. Cobre **F-08, RN-05, CA-04**. Backend: cadastro multipart, mídia Cloudinary privada, diário de uploads e chave de idempotência. Cloudinary foi aprovada pelo professor; falta comprovar o percurso real integrado.

**2. Arquivos previstos**

- Existentes: `src/features/avancos/pages/{NovoAvancoPage,AvancosPage,AvancoPage}.jsx`, rotas do módulo e `src/shared/api/http.js`.
- Proposta: `src/features/avancos/api.js`, `src/features/avancos/components/AvancoForm.jsx`, `src/shared/ui/MediaPicker.jsx`, `src/shared/ui/MediaViewer.jsx`, `src/shared/api/midias.js` e `tests/e2e/uc-08.spec.js`.

**3. Fazer**

- Carregar o marco e enviar `POST /marcos/{marcoId}/avancos` com `FormData`: `data` em `AAAA-MM-DD`, `descricao` e arquivos no campo repetido `midias`. Não enviar estado, marco no corpo, autoria ou registro. `201` retorna o avanço e `Location: /avancos/{id}`.
- Exigir pelo menos uma mídia, até cinco arquivos no cadastro. Orientar JPEG/PNG, MP4 e PDF; padrões do servidor: 10 MiB por foto/PDF, 100 MiB por vídeo e 110 MiB no multipart completo. Conferir a configuração do ambiente antes de fixar limites visuais; não existe endpoint de catálogo de limites. Validação de conteúdo permanece no servidor. O navegador define boundary e tamanho HTTP: não fixar manualmente `Content-Type` ou `Content-Length` no fetch.
- Usar uma `Idempotency-Key` por cadastro e preservar chave/dados nos retries da mesma operação. Mesmo conteúdo/chave retorna o mesmo recurso (`201`); nova intenção usa nova chave. `409` de operação pendente não autoriza criar outra para contornar a incerteza.
- Implementar `GET /marcos/{marcoId}/avancos` (array) e `GET /avancos/{id}` para lista/detalhe, exibindo estado, data, descrição, registro, autoria e mídia. O rascunho não entra na prévia de publicações.
- Abrir evidências por `GET /midias/{id}/conteudo`, com Bearer, e converter a resposta binária em Blob/URL temporária local para imagem/vídeo/download. O cliente atual só lê JSON: ampliar a leitura binária sem quebrar erros JSON/`401`. Reutilizar metadados retornados ou `GET /avancos/{id}/midias` e `GET /midias/{id}`. Não apontar `src` diretamente à rota protegida nem colocar JWT na URL. Liberar URLs Blob ao trocar de registro/sair.
- Mostrar seleção vazia, envio, sucesso, erro por arquivo e recuperação da mídia. Tratar `411`, `413`, `415`, `422`, `409` e `503`; `502` na leitura distingue conteúdo ausente/provedor indisponível. Abertura que falha não é “sem anexo”. Cancelar antes de enviar não cria; interrupção durante envio exige conferir resultado.

**4. Pronto quando**

Foto, vídeo e PDF enviados pelo React são recuperados pela rota autenticada no ambiente integrado, inclusive após reinício. Um rascunho sem mídia não é anunciado como salvo. Repetir cadastro com a mesma chave não duplica. Mídias nunca expõem segredos/URL privada do provedor; logout impede nova leitura. Falha de upload ou commit incerto aparece como falha/pendência real.

**5. Testes relacionados**

CT-31 a CT-36, CT-109, CT-110 e CT-111. Backend: `tests/avancos/test_cadastro_http.py`, `test_cadastro_contrato.py`, `test_idempotencia.py`, `test_falhas_cadastro.py`, `tests/midias/test_acesso.py`, `tests/integracao/test_fluxo_midias_real.py`. **FE-UC-08 proposto:** multipart real do navegador, retry com chave estável, mídia com token vencido e liberação de Blob. Integração real depende das credenciais exclusivas previstas em `tests/README.md`.

**6. Dependências**

UC-01/05 e Cloudinary configurada no servidor. UC-08 é dono do envio/visualização compartilhados com UC-09/10/11/14/21. Proxy deve aceitar os tamanhos necessários. Reconciliação de uploads é operacional no backend; não criar endpoint de limpeza ou executar rotinas administrativas pelo navegador.

## [Frontend][UC-09] Editar ou retirar avanço em rascunho

**1. Contexto e cobertura**

Confirmado: revisar ou excluir antes de publicar, mantendo pelo menos uma mídia. Cobre **F-09, RN-05, CA-04**. Backend: PATCH de rascunho e DELETE retomável. Proposta: reutilizar o formulário de UC-08 e o detalhe como ponto de entrada.

**2. Arquivos previstos**

- Existentes: `src/features/avancos/pages/EditarAvancoPage.jsx`, `AvancoPage.jsx` e `AvancosPage.jsx` no mesmo diretório.
- Reutilizar API/formulário/mídia de UC-08 e confirmação de UC-06.
- Proposta: `src/shared/ui/PendenciaExclusao.jsx`, `src/shared/api/exclusoes.js`, `tests/e2e/uc-09.spec.js`; complementar `src/shared/api/http.js` para acesso explícito ao status/headers quando necessário.

**3. Fazer**

- Consultar o avanço antes de editar. Somente rascunho recebe edição simples; publicado abre correção de UC-11. O mesmo endpoint PATCH despacha pelo estado atual no servidor, portanto uma publicação concorrente não deve ser tratada como edição bem-sucedida do rascunho.
- Enviar `PATCH /avancos/{id}` com JSON para `data`, `descricao`, `midias_manter` ou multipart quando adicionar `midias`; em multipart, `midias_manter` é uma lista JSON textual de IDs. Campo omitido é preservado; lista vazia significa retirar as atuais, exigindo substituição para continuar com uma mídia. Não mandar revisão/autoria como campos inventados.
- Após `200`, reler detalhe e lista. Tratar `422` de última mídia/ID alheio, `413` de lote, `409` de concorrência/publicação e `503` de falha. Em resultado incerto, consultar o recurso antes de repetir uploads. A limpeza de mídias antigas após edição tem uma limitação: `_limpar_apos_edicao` pode registrar tarefa pendente internamente e ainda retornar `200` da edição, sem campo público que a exponha. Mostrar “Rascunho atualizado”, sem afirmar “Arquivos antigos removidos”. Não fabricar um aviso individual de pendência sem resposta que o sustente.
- Para excluir, identificar alvo e perda de mídias/exemplos associados, reutilizando dados do detalhe ou `GET /avancos/{id}/exclusao`. Cancelar/Escape não envia DELETE. Confirmar rascunho usa `DELETE /avancos/{id}` sem exigir o corpo `confirmar` do fluxo de publicados.
- Aceitar conclusão somente após `204`. Em `503 LIMPEZA_PENDENTE`, manter ação de retomada pelo mesmo DELETE, com estado visível e contexto suficiente para não perder a operação ao reconsultar. Respeitar `Retry-After` quando retornado. `409` de exclusão em curso pede aguardar/reconsultar, sem loop agressivo.
- O cliente atual devolve apenas dados e `null` em `204`; oferecer opção compatível para inspecionar status/headers, sem considerar todo `2xx` ou todo `null` como exclusão concluída. UC-17/18 reutilizam essa base, com seus contratos distintos.

**4. Pronto quando**

Edição mantém rascunho fora da prévia e permite alterar texto/data/mídia sem perder o mínimo exigido. Cancelar não grava. Exclusão só sai como concluída após `204`, inclusive em retomada após falha. Registro já publicado é encaminhado ao fluxo correto; não há publicação acidental ou sucesso falso de limpeza.

**5. Testes relacionados**

CT-37 a CT-40, CT-42 e desvio CT-84 para limpeza. Backend: `tests/avancos/test_edicao_rascunhos.py`, `test_exclusao_rascunhos.py`. **FE-UC-09 proposto:** publicação concorrente, edição confirmada sem promessa de limpeza externa, cancelamento sem DELETE e retomada de exclusão após recarga.

**6. Dependências**

UC-08/06. UC-11 atende registros que já foram publicados; UC-18 reutiliza esta exclusão para o ramo de rascunho, sem implementá-la novamente. Não tratar `exclusao_pendente` como estado de negócio selecionável. Exibir tarefas internas de limpeza de uma edição exigiria extensão do contrato de backend; não é capacidade disponível na resposta atual. O protocolo público de pendência descrito neste cartão refere-se à exclusão.

## [Frontend][UC-10] Publicar avanço e ver prévia

**1. Contexto e cobertura**

Confirmado: publicar uma evidência revisada e consultar a linha do tempo, ainda como construtora. Cobre **F-10, RN-05, CA-04**. Backend de publicação/consulta existe; prévia não é portal público de comprador. Proposta: usar as páginas de revisão e publicações já roteadas.

**2. Arquivos previstos**

- Existentes: `src/features/publicacoes/pages/PublicarPage.jsx`, `PublicacoesPage.jsx`, rotas do módulo e `src/features/avancos/pages/AvancoPage.jsx`.
- Proposta: `src/features/publicacoes/api.js`, `src/features/publicacoes/components/AtualizacaoCard.jsx`, `tests/e2e/uc-10.spec.js`. Reutilizar mídia de UC-08 e confirmação de UC-06.

**3. Fazer**

- Carregar `GET /avancos/{id}` para revisar descrição, data, marco e anexos antes da confirmação. Cancelar volta ao detalhe sem publicar.
- Enviar `POST /avancos/{id}/publicacoes` sem corpo ou com `{}`; não enviar autor, data de publicação ou uma cópia editável do conteúdo. Primeira publicação retorna `201`, repetição retorna `200`, preservando o mesmo fato.
- Consultar `GET /avancos/{id}/publicacoes` (`{publicacoes:[...]}`) e `GET /obras/{obraId}/previa` (`{atualizacoes:[...]}`). Preservar a ordem retornada, por publicação original decrescente; não reordenar pela data do trabalho ou por correção.
- Apresentar contexto do marco, conteúdo atual, publicação, mídia e indicação de edição/origem simulada quando retornadas. Rascunhos ficam fora. Abrir detalhes/correção/versões pelas rotas React adequadas.
- Após publicar, atualizar detalhe, lista de avanços e prévia; se a consulta posterior falhar, informar que a publicação foi confirmada, mas a visualização não pôde ser atualizada. Não repetir a decisão para “consertar” erro de leitura.
- Tratar lista vazia, carregamento, `404`, `422` de conteúdo/mídia inválidos, `409` de conflito e `503` de provedor/banco. Prévia com mídia que falha deve indicar falha do arquivo, sem esconder o fato da publicação.

**4. Pronto quando**

Uma publicação aparece uma única vez na prévia após confirmação e continua após reinício. Rascunho nunca aparece; cancelamento não publica. Autor/instante vêm do servidor. Duplicar a requisição não duplica o cartão visual nem registros. Os três tipos de mídia são recuperáveis no ambiente integrado.

**5. Testes relacionados**

CT-41 a CT-45; CT-109 a CT-111 para integração. Backend: `tests/avancos/test_publicacoes.py`, `test_previa.py`, `tests/midias/test_acesso.py`. **FE-UC-10 proposto:** duplo clique/resposta perdida, consulta da prévia falhando após publicação e distinção de data do trabalho/publicação.

**6. Dependências**

UC-08 e contexto UC-03/05. UC-11 complementa edição/versões e UC-21 a apresentação de exemplos. A aprovação da Cloudinary está confirmada; disponibilidade real e upload/recuperação no EC2 continuam critérios de aceite.

## [Frontend][UC-11] Corrigir atualização publicada

**1. Contexto e cobertura**

Confirmado: corrigir publicação com motivo preservando conteúdo anterior, campos, autoria e instantes. Cobre **F-11, RN-06, CA-05**. Backend: correção no PATCH de avanços e consulta de cadeia de versões. Proposta: editor reutilizado, acrescido de motivo, e comparação na página de versões existente.

**2. Arquivos previstos**

- Existentes: `src/features/publicacoes/pages/CorrigirPage.jsx`, `VersoesPage.jsx`, `PublicacoesPage.jsx` e `src/features/avancos/pages/AvancoPage.jsx`.
- Reutilizar APIs de UC-08/10 e componentes de mídia/formulário.
- Proposta: `src/features/publicacoes/components/ComparacaoVersoes.jsx`, `tests/e2e/uc-11.spec.js`.

**3. Fazer**

- Carregar publicação atual e `GET /avancos/{id}/versoes`, que retorna `{avanco_id, versoes}`. Exibir a versão inicial e as correções, com `numero`, `atual`, `conteudo`, `autor_original`, `origem_simulada` e `correcao` quando presente.
- Enviar `PATCH /avancos/{id}` com campos efetivamente alterados (`descricao`, `data`, `midias_manter`) e `motivo`; novos arquivos exigem multipart e os mesmos nomes de UC-09. Não exigir mudança de data: o contrato a permite, enquanto texto/mídia são o fluxo central do UC.
- Motivo deve ser preenchido e deve existir alteração efetiva. Preservar ao menos uma mídia; deixar claro quais atuais serão mantidas. Arquivos antigos de versões ficam retidos pelo servidor, não são apagados pelo React.
- Mostrar `correcao.campos` e diferenças textuais retornadas (`igual`, `inserido`, `removido`, `substituido`, com `antes`/`depois`). Renderizar como texto seguro, sem HTML arbitrário. Não gerar auditoria nem recalcular uma cadeia substituta no cliente.
- Preservar autoria original e mostrar a autoria da correção separadamente. Em origem simulada de engenheiro, indicar “Simulado” e “Editado pela construtora”, com texto anterior e alterações destacadas.
- Mídia histórica com `retida:false`/`conteudo:null` mostra metadados e indisponibilidade. `retida:true` não prova acesso remoto; tratar erro ao abrir. `409 HISTORICO_INDISPONIVEL` é falha de integridade, não histórico vazio.
- Cancelar não envia PATCH. Após `200`, atualizar detalhe, versões, prévia e histórico. Em `409`, recarregar e revisar; em `422`, corrigir campos; em falha/timeout, conferir estado real antes de reenviar uma correção não idempotente.

**4. Pronto quando**

Duas correções permanecem comparáveis e a prévia mostra conteúdo atual com indicação de edição. Motivo vazio/ausência de alteração não cria versão. Falha não substitui a publicação por dados locais. Origem simulada e autor da construtora são distintos; mídia histórica indisponível não se torna link falso.

**5. Testes relacionados**

CT-46 a CT-51. Backend: `tests/avancos/test_correcao_publicada.py`, `test_versoes.py`. **FE-UC-11 proposto:** texto com marcação HTML exibido como texto, restauração ao texto original ainda marcada como edição, mídia não retida e conflito de histórico.

**6. Dependências**

UC-08/09/10; exemplo pré-carregado de engenheiro para CT-50. UC-11 implementa primeiro o leitor/comparador reutilizado por UC-13/21. Nenhuma rota adicional de versão, PUT de publicação ou limpeza de histórico é necessária.

## [Frontend][UC-12] Alterar prazo ou situação de obra/marco

**1. Contexto e cobertura**

Confirmado: replanejar com motivo e preservar antes/depois; concluir e reabrir obra/marco. Cobre **F-12, RN-01, RN-02, RN-07, CA-06**. Backend implementado. Proposta: ampliar `NovaMudancaPage`, com alvo/campo e valor atual visível, reutilizando o comando iniciado em UC-07.

**2. Arquivos previstos**

- Existentes: `src/features/historico/pages/NovaMudancaPage.jsx`, rotas do módulo, `src/features/obras/pages/EditarObraPage.jsx` e detalhe de marco.
- Reutilizar `src/features/historico/api.js`, `EstadoMarcoForm` de UC-07, prazo de UC-02 e consultas de UC-03/05.
- Proposta: `src/features/historico/components/MudancaForm.jsx`, `tests/e2e/uc-12.spec.js`.

**3. Fazer**

- Consultar o alvo atual e sua `versao`. Enviar `POST /obras/{obraId}/mudancas` com `{alvo:{tipo,id},campo,novo_valor,motivo,versao}`. Não enviar valor anterior, autor ou instante; o servidor os deriva.
- Para obra: `campo:"entrega"` com o objeto completo de data exata/intervalo, ou `campo:"estado"` com `planejada`, `em andamento`, `concluída`, `suspensa`.
- Para marco: `campo:"periodo_previsto"` com `{inicio_previsto,fim_previsto}`, ou `campo:"estado"` com os três valores de UC-07. Reutilizar o aviso `DEPENDENCIAS_PENDENTES` e só reenviar `confirmar_dependencias:true` após confirmação, somente para estado de marco.
- Exibir valor anterior como leitura e exigir motivo; validar datas e limites. Alternar modalidade envia apenas o novo formato. Não oferecer edição de `atrasada`, `critica` ou `data_conclusao`. A conclusão usa o dia UTC do servidor; reabrir limpa a conclusão atual e preserva a anterior no histórico.
- `200` devolve alvo atualizado/versão; reconsultar resumo, lista e histórico. Decisão sem diferença não cria evento: não inserir um evento visual local. As rotas legadas `PATCH /obras/{id}/estado` e `PATCH /marcos/{id}` existem, mas o formulário compartilhado usa um único comando.
- Tratar `409` de versão desatualizada com releitura e nova revisão explícita, preservando a intenção digitada separada do valor atual. Tratar `400`/`404`, `422`, `500` e falhas de conexão. Cancelar antes de enviar não altera alvo/histórico.

**4. Pronto quando**

Trocar modalidade da entrega, alterar período do marco, concluir/reabrir e repetir uma decisão sem mudança produzem o comportamento real esperado. O novo valor e a trilha persistem juntos; erro não anuncia histórico criado. Alerta exibido acompanha a resposta do servidor. Um formulário antigo não sobrescreve versão nova sem decisão do usuário.

**5. Testes relacionados**

CT-52 a CT-59; CT-27/28 no caminho de estado de marco; CT-111. Backend: `tests/mudancas/test_mudancas.py`, `tests/obras/test_estado.py`, `tests/marcos/test_estado.py`. **FE-UC-12 proposto:** conflito entre duas abas, troca de modalidade sem campos residuais e repetição sem evento artificial.

**6. Dependências**

UC-02/03/05/07. UC-13 entrega a navegação completa do histórico; a leitura mínima de UC-07 permite validar a persistência antes disso. Atlas/transações e geração automática de conclusão são responsabilidades do backend.

## [Frontend][UC-13] Consultar histórico de mudanças e versões

**1. Contexto e cobertura**

Co*nfirmado: explicar quem mudou o quê, quando e por quê, sem alterar a trilha. Cobre **F-13, RN-06, RN-07, CA-05, CA-06**. Backend reúne mudanças de obra, marco e correções publicadas. Proposta: preencher lista/detalhe existentes e ligar às versões de UC-11.

**2. Arquivos previstos**

- Existentes: `src/features/historico/pages/HistoricoPage.jsx`, `MudancaPage.jsx` e rotas do módulo.
- Reutilizar `src/features/historico/api.js` de UC-07, `ComparacaoVersoes` de UC-11 e utilitários de datas.
- Proposta: `src/features/historico/components/EventoHistorico.jsx`, `tests/e2e/uc-13.spec.js`.

**3. Fazer**

- Consultar `GET /obras/{obraId}/mudancas`, resposta `{mudancas:[...]}`. Mostrar alvo, campo, antes/depois, motivo, autor e instante; interpretar objetos de prazo de forma legível, preservando todos os valores retornados.
- Manter a ordenação da API, inclusive eventos empatados. Os IDs de eventos devem ser tratados como opacos, sem validação obrigatória de ObjectId no navegador.
- Usar o caminho `consulta` retornado para `GET /mudancas/{id}`; em correções, `comparacao` aponta ao `GET /avancos/{id}/versoes`. Converter esses recursos para as rotas de tela de detalhe/versões, mantendo autenticação e contexto da obra.
- Ligar ao objeto atual quando ele estiver disponível; `404` deve informar ausência sem mostrar outro registro. Obra existente com histórico vazio tem estado próprio.
- `409 HISTORICO_INDISPONIVEL` deve mostrar falha e opção de consultar novamente, sem fabricar versões ou apresentar “nenhuma mudança”. Tratar `503` e falha de conexão preservando distinção de vazio/erro.
- Não adicionar edição/exclusão isolada de evento. Transições e aceitações de ocorrência ficam em UC-15/16: não afirmar que este endpoint as agrega se não forem retornadas.

**4. Pronto quando**

Mudanças de obra/marco e duas correções de publicação podem ser abertas e comparadas com valores e autores reais. Entradas anteriores não somem após alteração posterior. Histórico vazio, alvo ausente e histórico inconsistente produzem estados distintos. Nenhuma interação de consulta envia escrita.

**5. Testes relacionados**

CT-60 a CT-63 e CT-46/51 na comparação. Backend: `tests/historico/test_consultas.py`, `tests/integracao/test_historico.py`. **FE-UC-13 proposto:** navegação com ID opaco, múltiplos eventos no mesmo instante, valor complexo legível e resposta `409` sem falso vazio.

**6. Dependências**

UC-07/11/12 para produzir e apresentar os três tipos de eventos. Pode iniciar com dados persistidos existentes. UC-17/18 removem registros segundo a cascata; a interface não mantém uma cópia permanente do histórico excluído.

  ## [Frontend][UC-14] Registrar ocorrência

**1. Contexto e cobertura**

Confirmado: registrar problema da obra, inicialmente `aberta` ou `sem solução`, com marco, responsável e mídia opcionais. Cobre **F-14, RN-08, CA-07**. Backend implementado. A data disponível é `data_registro`, gerada pelo servidor; não há campo contratual de data manual do problema. Proposta: formulário, lista e detalhe nas rotas existentes.

**2. Arquivos previstos**

- Existentes: `src/features/ocorrencias/pages/{NovaOcorrenciaPage,OcorrenciasPage,OcorrenciaPage}.jsx` e rotas.
- Proposta: `src/features/ocorrencias/api.js`, `src/features/ocorrencias/components/OcorrenciaFields.jsx`, `tests/e2e/uc-14.spec.js`.
- Reutilizar mídia de UC-08, seleção de marco de UC-05 e consultas de trabalhadores de UC-19.

**3. Fazer**

- Enviar `POST /obras/{obraId}/ocorrencias` com `titulo`, `descricao`, `estado` e opcionais `marco_id`, `responsavel_id`. Sem arquivos usar JSON; com arquivos usar multipart, campos textuais e até cinco arquivos em `midias`. Não enviar URLs/IDs de mídias de outros registros, data de registro ou autoria.
- Permitir opcionais omitidos/nulos/vazios segundo o contrato. No multipart, omitir seleção vazia ou usar texto vazio, sem transformar `null` na string literal. Selecionar marco da obra e trabalhador cadastrado/vinculado à obra; sem trabalhadores, permitir cadastro por UC-19 ou seguir sem responsável.
- Validar título/descrição e os dois estados iniciais. Reutilizar seleção e abertura de JPEG/PNG, MP4 e PDF; ausência de mídia é válida neste UC. Data de cadastro retornada deve aparecer como registro, não como data informada pelo usuário.
- `201` contém ocorrência e `Location`; abrir detalhe e atualizar lista. Consultar `GET /obras/{obraId}/ocorrencias` (`{ocorrencias:[...]}`) e `GET /ocorrencias/{id}`. Mostrar estado, vínculos, evidências, autoria e registro; guardar `versao`/`episodio` para ações posteriores.
- `sem solução` nasce com aceitações vazias. Exibir ação de UC-16 sem marcar aceitação automática. Se houver `responsavel_anterior`, mostrar como atribuição histórica, separada do responsável atual.
- Tratar `400`, `404` de vínculos, `415`, `422`, `413` de mídia quando retornado e `503`. Este POST não é idempotente: em timeout/resultado incerto, consultar a lista antes de propor reenvio; não aplicar a chave de UC-08 como garantia inexistente.
- Carregamento, lista vazia, erro e cancelamento devem ser explícitos; cancelar antes do POST não grava. Ocorrência não recebe publicação nem aparece como avanço na prévia.

**4. Pronto quando**

Ocorrência sem opcionais e ocorrência com marco/responsável/mídia são criadas e consultadas após reinício. Marco ou responsável inválido não produz registro aparentemente completo. `sem solução` não aparece aceita antes de UC-16. Erro de mídia/banco não é convertido em sucesso, e resposta perdida não provoca duplicação automática.

**5. Testes relacionados**

CT-64 a CT-68; CT-111. Backend: `tests/test_ocorrencias.py`, `tests/integracao/test_todas_rotas.py`; validações em `app/ocorrencias/validacoes.py`. **FE-UC-14 proposto:** opcional vazio no multipart, seleção de trabalhador sem vínculo, falha com confirmação incerta e distinção de responsável atual/anterior.

**6. Dependências**

UC-03; UC-05/19 para opcionais e UC-08 para mídia. O caminho sem opcionais pode ser entregue antes desses seletores. A limpeza de atribuição ao desvincular o trabalhador, confirmada nesta conversa, ainda depende da correção de backend indicada em UC-20; não simulá-la no detalhe.

## [Frontend][UC-15] Atualizar, resolver ou reabrir ocorrência

**1. Contexto e cobertura**

Confirmado: corrigir descrição/vínculos ou mudar estado com motivo, preservando transições e aceitações anteriores. Cobre **F-15, F-16, RN-08, CA-07**. Backend permite exatamente `aberta`, `resolvida`, `sem solução`; não criar estados adicionais. Proposta: edição descritiva e transição claramente identificadas no formulário existente.

**2. Arquivos previstos**

- Existentes: `src/features/ocorrencias/pages/EditarOcorrenciaPage.jsx`, `OcorrenciaPage.jsx` e `OcorrenciasPage.jsx`.
- Reutilizar API/campos de UC-14, seleção de marco/trabalhador e datas.
- Proposta: `src/features/ocorrencias/components/HistoricoOcorrencia.jsx`, `tests/e2e/uc-15.spec.js`; UC-16 reutiliza a apresentação histórica.

**3. Fazer**

- Carregar `GET /ocorrencias/{id}` e sua `versao`. Enviar `PATCH /ocorrencias/{id}` com JSON `{versao,alteracoes?,transicao?}`; ao menos uma operação é necessária.
- `alteracoes` aceita somente `titulo`, `descricao`, `marco_id`, `responsavel_id`; vínculos podem ser retirados com `null`. Enviar apenas alterações pretendidas, sem reenviar responsável antigo automaticamente. `transicao` contém `{estado,motivo}`; pode acompanhar a edição ou ser enviada sozinha.
- Permitir transições entre os três estados, inclusive resolver ocorrência anteriormente aceita e reabri-la. Motivo obrigatório pertence à transição. Não enviar estado na raiz/`alteracoes`, nem editar mídias, autoria, obra, registro, aceitações ou histórico por esse PATCH.
- Exibir `historico_estados` em ordem retornada, com estado anterior/novo, motivo, autor e instante. Separar `aceitacoes` históricas de `aceitacoes_do_estado_atual`. Uma decisão antiga não aceita automaticamente outro episódio.
- `200` retorna ocorrência atualizada; atualizar lista/detalhe. Pedido sem mudança efetiva não cria evento. Cancelar não envia PATCH.
- Em `409`, consultar novamente e mostrar a diferença antes de reenviar; não substituir a versão silenciosamente. Em timeout, consultar resultado antes de repetir. `400`/`404`, `415`, `422` e `503` mantêm mensagem específica e formulário recuperável.
- Após mudanças de trabalhador, reler responsável e apresentar `responsavel_anterior` quando devolvido. Não manter uma atribuição visual apenas porque o seletor tinha o ID anteriormente, nem limpar localmente antes da confirmação do servidor.

**4. Pronto quando**

Resolver, reabrir e corrigir descrição preservam a trilha e as aceitações. Edição descritiva não muda estado. Aceitação histórica não aparece como decisão do episódio atual. Conflito em outra aba solicita revisão, e falha não exibe uma transição inventada. A atualização decorrente de desvinculação só é considerada integrada depois da correção de UC-20 no backend.

**5. Testes relacionados**

CT-69 a CT-73. Backend: `tests/test_atualizacao_ocorrencias.py`; contrato e validações em `app/ocorrencias/`. **FE-UC-15 proposto:** retorno a `sem solução` com aceitações antigas, erro de vínculo após troca de equipe, duas abas e resposta de commit perdida.

**6. Dependências**

UC-14, UC-05/19 para seletores, UC-16 para decisões de aceitação. Há dependência de correção do backend de UC-20 para a regra confirmada de desvinculação e para prevenir reenvio de uma atribuição antiga; as outras edições/transições podem avançar.

## [Frontend][UC-16] Aceitar ocorrência sem solução

**1. Contexto e cobertura**

Confirmado: registrar decisão justificada sem declarar o problema resolvido. Aceitações podem se repetir, preservando as anteriores. Cobre **F-15, RN-08, CA-07**. Backend oferece gravação idempotente por chave e consulta histórica. Proposta: formulário e lista na página `AceitacoesPage` existente.

**2. Arquivos previstos**

- Existentes: `src/features/ocorrencias/pages/AceitacoesPage.jsx`, `OcorrenciaPage.jsx` e rotas do módulo.
- Reutilizar API de UC-14, histórico de UC-15, confirmação de UC-06 e tratamento de erros de UC-01.
- Proposta: `tests/e2e/uc-16.spec.js`; eventual utilitário de chave de reenvio compartilhado com UC-08, respeitando as diferenças dos contratos.

**3. Fazer**

- Consultar ocorrência/estado antes de oferecer nova aceitação. Mostrar explicação de que aceitar não resolve nem exclui a ocorrência. Exigir `justificativa`; `medida_compensatoria` é opcional. Campo opcional vazio deve ser omitido ou enviado como `null`, não como texto vazio inválido.
- Confirmar envia `POST /ocorrencias/{id}/aceitacoes` com `{justificativa,medida_compensatoria?}` e `Idempotency-Key`. Gerar uma chave por decisão explícita, preservando-a com os mesmos textos em toda retomada, inclusive após recarga. Não enviar autor, data, episódio ou versão da aceitação.
- Tratar `201` como nova decisão e `200` como repetição da original. Uma decisão nova usa nova chave. Não substituir uma aceitação anterior nem reutilizar chave antiga para aceitar novo episódio.
- Consultar `GET /ocorrencias/{id}/aceitacoes` (array) e reler o detalhe. Exibir justificativa, compensação quando houver, autor, `data` e distinção histórica/atual dada pelo backend. Cancelar antes da confirmação não envia POST.
- `409` pode representar estado/episódio incompatível ou chave usada com outro conteúdo; mostrar o motivo e consultar novamente. Não repetir automaticamente com chave nova. `422` indica campo/chave inválida; `415`, `400`, `404` e `503` têm tratamento próprio.
- Em timeout, reenviar a mesma chave e conteúdo para descobrir o resultado sem duplicar. Se a ocorrência já mudou de estado, uma resposta de chave antiga é decisão histórica, não nova aceitação atual.

**4. Pronto quando**

Aceitar sem compensação funciona e mantém estado `sem solução`. Justificativa vazia ou estado incompatível não cria decisão. Duas decisões explícitas ficam no histórico; reenvio da mesma não duplica. Resolver/reabrir preserva decisões sem reaplicá-las ao estado atual. Carregamento/erro nunca aparecem como lista histórica vazia.

**5. Testes relacionados**

CT-74 a CT-78, CT-73 e CT-111. Backend: `tests/test_aceitacao_ocorrencias.py`, `tests/ocorrencias/test_aceitacoes.py`. **FE-UC-16 proposto:** timeout/reload com chave preservada, mudança de episódio durante confirmação e campo compensação vazio.

**6. Dependências**

UC-14/15 e confirmação UC-06. O servidor controla episódio, autoria e atomicidade. Não criar quarto estado “aceita”; o indicador de aceitação decorre dos registros aplicáveis ao episódio atual.

## [Frontend][UC-17] Excluir obra ou marco com todos os dependentes

**1. Contexto e cobertura**

Confirmado: exclusão definitiva com aviso da perda e confirmação. Excluir marco remove suas ocorrências, conforme decisão de 30/10; não reabrir essa dúvida porque há texto antigo marcado como proposta. Cobre **F-19, RN-09, CA-09**. Backend usa transação e diário de limpeza; conclusão somente em `204`.

**2. Arquivos previstos**

- Existentes: `src/app/layouts/ObraLayout.jsx`, `src/features/obras/pages/ObrasPage.jsx`, `src/features/marcos/pages/MarcoPage.jsx`, `MarcosPage.jsx` e respectivos clientes API.
- Reutilizar `ConfirmDialog` de UC-06 e pendência/status de exclusão de UC-09.
- Proposta: `src/shared/ui/ImpactoExclusao.jsx`, `tests/e2e/uc-17.spec.js`.

**3. Fazer**

- Antes de confirmar, carregar o detalhe para identificar nome/ID e mostrar a extensão da perda. Obra leva marcos, avanços/publicações/versões, mudanças/histórico, ocorrências/aceitações, mídias e exemplos associados; retira vínculos dos trabalhadores, preservando seus cadastros e outras obras. Marco leva seus registros e ocorrências, além das dependências que o referenciam; obra e outros marcos permanecem.
- O backend não oferece `GET /obras/{id}/exclusao` nem `GET /marcos/{id}/exclusao`. Proposta de aviso compatível: detalhar as categorias afetadas e usar números apenas quando provenientes de consultas completas; não inventar totais nem usar só a prévia publicada para contar todos os avanços/versões.
- Existe resposta `422 CONFIRMACAO_OBRIGATORIA` em DELETE sem confirmação, com `alvo`/`perda`, mas não usar uma tentativa de DELETE para abrir o diálogo: a aceitação prevista exige cancelamento sem DELETE. O aviso categórico com nome do alvo atende ao contrato atual; se a equipe exigir contagem exata prévia, registrar dependência de uma consulta específica no backend antes de prometer isso.
- Confirmar envia `DELETE /obras/{obraId}` ou `DELETE /marcos/{marcoId}` com exatamente `{confirmar:true}`. Não anexar `obra_id`/`marco_id` ao corpo de UC-17: esse contrato rejeita campos extras. Cancelar/Escape não envia a operação.
- Após `204`, remover dados locais associados e voltar à lista de obras ou marcos; atualizar dependências, ocorrências e contexto. Não exibir histórico excluído de um cache antigo.
- Tratar `409 CONFLITO_EXCLUSAO`/`REFERENCIA_EXTERNA`, `422` de confirmação/referência e `500` sem sucesso. `503 LIMPEZA_PENDENTE` ou `EXCLUSAO_INDETERMINADA` exigem pendência visível e retomada do mesmo DELETE confirmado. A obra pode já ter saído do banco: um GET `404` não prova que a limpeza externa terminou.
- Preservar endpoint/identificador da operação para retomar mesmo depois de recarga, sem apresentar o alvo como obra ativa fictícia. Repetição após conclusão pode retornar `404`; não equiparar esse retorno ao `204` que comprova a operação atual.

**4. Pronto quando**

Cancelar preserva dados e não envia DELETE. Confirmar remove o conjunto correto, mantém outros marcos/obras/trabalhadores e só anuncia conclusão depois de `204`. Falha externa permanece pendente e pode ser retomada após recarga/reinício. O aviso deixa explícita a perda do histórico e das ocorrências do marco.

**5. Testes relacionados**

CT-79 a CT-85, CT-100 e CT-106. Backend: `tests/test_exclusao_cascata.py`, `app/exclusoes.py`, `app/obras/exclusoes.py`, `app/marcos/exclusoes.py`. **FE-UC-17 proposto:** cancelamento sem DELETE, pendência com GET posterior `404`, corpo sem campos extras e cache de histórico descartado.

**6. Dependências**

UC-03/05 para alvos; UC-06/09 para confirmação/retomada; dados de UC-08/11/14/16/19/21 para validar o impacto completo. Não criar exclusão isolada de mudança. Limpeza remota e remoção de órfãos continuam responsabilidades do servidor.

## [Frontend][UC-18] Excluir avanço ou ocorrência individualmente

**1. Contexto e cobertura**

Confirmado: retirar registro indevido e seus dependentes diretos com aviso/confirmar/cancelar. Cobre **F-19, RN-09, CA-09**. Backend já remove publicados e ocorrências, apesar de trechos antigos do README dizerem que DELETE de avanço é só para rascunho. Proposta: ação no detalhe do registro, reutilizando a infraestrutura anterior.

**2. Arquivos previstos**

- Existentes: `src/features/avancos/pages/AvancoPage.jsx`, `AvancosPage.jsx`, `src/features/ocorrencias/pages/OcorrenciaPage.jsx`, `OcorrenciasPage.jsx` e `src/features/publicacoes/pages/PublicacoesPage.jsx`.
- Reutilizar APIs, `ConfirmDialog`, `ImpactoExclusao` e pendências de UC-09/17.
- Proposta: `tests/e2e/uc-18.spec.js`. Referência existente no backend: `app/static/exclusao-registro.js`; não importá-la diretamente como se já fosse componente React compatível.

**3. Fazer**

- Consultar `GET /avancos/{id}/exclusao` ou `GET /ocorrencias/{id}/exclusao`. Mostrar `alvo` e `perda`: versões/publicação/mídias/exemplos do avanço ou histórico/aceitações/mídias da ocorrência, conforme a resposta. Falha na prévia não permite confirmar com impacto inventado.
- Cancelar/Escape não envia DELETE. Para avanço **publicado** e ocorrência, enviar `DELETE /avancos/{id}` ou `DELETE /ocorrencias/{id}` com `{confirmar:true}`. Incluir contexto `obra_id` e, quando aplicável, `marco_id` retornados na prévia, uma única vez no corpo ou query; o servidor verifica a cadeia. Não confundir com o corpo estrito de UC-17.
- Para rascunho, delegar ao fluxo UC-09, que usa o mesmo endpoint e contrato próprio. Não criar segunda lógica de edição/exclusão de rascunho.
- Somente `204` libera confirmação de conclusão e atualização de listas/prévia/histórico. Se a publicação foi removida, não manter o cartão na prévia nem links ativos para suas versões.
- Tratar `400`, `404`, `422`, `409` de contexto/conflito/referência externa/upload pendente. Em `503 LIMPEZA_PENDENTE`, guardar a referência da operação e repetir o mesmo DELETE confirmado quando solicitado. `Retry-After` orienta espera; não mascarar a pendência com uma remoção apenas visual.
- O módulo JavaScript do backend recebe um fetch que devolve `Response`; `useAuth().request` devolve dados. Portanto, adaptar conscientemente o contrato ou implementar o diálogo React compartilhado, reaproveitando o comportamento e os testes, sem plugar funções incompatíveis. O sucesso do React deve conferir `204`, não apenas `response.ok`.

**4. Pronto quando**

Cancelar preserva registros; confirmar remove avanço publicado/versões da prévia ou ocorrência/aceitações do detalhe. Contexto adulterado não remove outro alvo. A mesma exclusão pode ser retomada sem duplicar efeitos após falha externa. O navegador só mostra conclusão confirmada e continua coerente após reinício.

**5. Testes relacionados**

CT-86 a CT-89; CT-39 reutilizado para rascunho. Backend: `tests/test_exclusao_registros.py`, `tests/test_exclusao_interface.mjs`, `app/exclusao_registros.py`. **FE-UC-18 proposto:** adaptação do cliente JSON versus Response, manipulação de contexto, pendência após remoção do documento e retorno à prévia sem cache antigo.

**6. Dependências**

UC-09/10/11 para avanço; UC-14/16 para ocorrência com aceitação; UC-17 para apresentação de impacto compartilhada, se entregue nessa ordem. Upload pendente pode exigir reconciliação operacional no backend; a interface informa o bloqueio, sem inventar botão que executa essa rotina.

## [Frontend][UC-19] Cadastrar e consultar trabalhadores da obra

**1. Contexto e cobertura**

Confirmado: cadastrar e consultar equipe da obra sem dar acesso ao sistema. Cobre **F-20, CA-10**. Trabalhador pertence à construtora e pode ter zero ou mais obras. Backend implementado; páginas React ainda são estruturas. Proposta: formulário, lista e detalhe já roteados.

**2. Arquivos previstos**

- Existentes: `src/features/trabalhadores/pages/{NovoTrabalhadorPage,TrabalhadoresPage,TrabalhadorPage}.jsx`, rotas do módulo e `src/shared/ui/UI.jsx`.
- Proposta: `src/features/trabalhadores/api.js`, `src/features/trabalhadores/components/TrabalhadorFields.jsx`, `src/features/trabalhadores/components/TrabalhadorSelect.jsx`, `tests/e2e/uc-19.spec.js`.

**3. Fazer**

- Enviar `POST /trabalhadores/obra/{obraId}/` com `{nome,email,telefone,cargo}`. Preservar barras finais. Não usar `/obras/{obraId}/trabalhadores`, pois esse caminho não está implementado.
- Exigir textos preenchidos, email válido e telefone com DDD de 10/11 dígitos; espaços, parênteses e hífen são aceitos, `+55` não faz parte do contrato. Não criar senha ou seleção de perfil de login. `ativo`, vínculo com construtora e cadastro vêm do servidor.
- `201` retorna `mensagem`, `id`, `obra_id` e `Location`; consultar `GET /trabalhadores/{id}/` para a representação completa, em vez de tratar a criação como detalhe completo.
- Listar `GET /trabalhadores/obra/{obraId}/` (array) e exibir nome, cargo, contato, vínculos, ativo e `data_cadastro` quando pertinente. A data é serializada em formato HTTP; apresentar corretamente sem supor ISO em todas as entidades.
- Estado vazio distingue obra sem trabalhadores de `404` de obra inexistente. Após cadastro, atualizar lista e seletor de responsável. Cancelar não envia POST. Tratar `400`, `404`, `422`, `503` e falha de conexão; resposta perdida exige consulta antes de novo cadastro.
- O seletor de responsável de UC-14/15 recebe apenas a lista da obra. As buscas existentes `GET /trabalhadores/nome/{termo}/` e `/cargo/{termo}/` consultam cadastros da construtora e não são filtradas pela obra; não usá-las como se provassem vínculo.

**4. Pronto quando**

Trabalhador cadastrado reaparece após recarga/reinício, com nome/cargo/telefone normalizados pelo servidor e detalhe acessível. Não aparece em obra sem vínculo nem recebe sessão. Campos inválidos não geram registro visual salvo. O cadastro pode ser selecionado como responsável na obra correta.

**5. Testes relacionados**

CT-90 a CT-95. Backend: `tests/trabalhadores/test_cadastro.py`, `test_consultas.py`, `test_persistencia_atlas.py`, `trabalhadores.py`. CT-93 usa ObjectId malformado/inexistente, não código numérico positivo do planejamento antigo. **FE-UC-19 proposto:** barras finais, criação seguida de detalhe, telefone formatado e data HTTP.

**6. Dependências**

UC-01/03 e obra existente. UC-19 implementa formulário/API/seleção reutilizados por UC-20 e UC-14/15. Não depende de portal de trabalhadores ou de funcionalidades de RH.

## [Frontend][UC-20] Editar vínculos/dados e excluir trabalhador

**1. Contexto e cobertura**

Confirmado: corrigir cadastro, substituir vínculos e excluir pessoa preservando obras e decisões. Cobre **F-20, RN-08, CA-10**. Nesta conversa foi confirmado: **retirar um vínculo limpa a atribuição somente nas ocorrências da obra retirada; excluir cadastro limpa todas as atribuições dessa pessoa, preservando responsável anterior e histórico.** O primeiro comportamento ainda não está implementado no backend local; não fechar essa parte do cartão como integrada.

**2. Arquivos previstos**

- Existentes: `src/features/trabalhadores/pages/EditarTrabalhadorPage.jsx`, `TrabalhadorPage.jsx`, `TrabalhadoresPage.jsx` e rotas do módulo.
- Reutilizar API/campos de UC-19, lista de obras de UC-03 e confirmação de UC-06.
- Proposta: `src/features/trabalhadores/components/VinculosObrasFields.jsx`, `tests/e2e/uc-20.spec.js`. No backend, a correção pertence a `app/trabalhadores/repository.py`/`service.py` e testes relacionados, fora da implementação deste cartão de frontend.

**3. Fazer**

- Carregar `GET /trabalhadores/{id}/`; editar somente `nome`, `email`, `telefone`, `cargo` e `obras`, conforme `PATCH /trabalhadores/{id}/`. Campo omitido é preservado. `ativo`, data, autoria e construtora não são editáveis nesse contrato.
- Selecionar obras existentes e explicar que `obras` substitui a lista inteira: obras omitidas são retiradas. Permitir `[]`; não excluir pessoa porque ficou sem vínculo. Validar IDs pela seleção e mostrar `422` com `obras` ausentes retornadas; nenhuma parte da edição deve ser apresentada como salva quando a API rejeita o conjunto.
- Proposta de interface: revisar os vínculos retirados antes de salvar, informando que ocorrências nessas obras ficarão sem responsável e preservarão a atribuição anterior. **Esse aviso depende da correção efetiva do backend; até lá a ação não satisfaz o requisito confirmado.** Não limpar ocorrências por PATCHs adicionais do React, pois isso quebraria a atomicidade da operação.
- Após `200` de edição (`mensagem`/`id`), reconsultar detalhe, listas das obras envolvidas e ocorrências afetadas. Não anunciar contagem de desatribuições no PATCH: a resposta atual não a fornece.
- Manter caminho de acesso ao trabalhador sem obras. Proposta: pesquisa por nome usando `/trabalhadores/nome/{termo}/`, identificada como busca da construtora, e acesso ao detalhe existente para relink. Não inventar `GET /trabalhadores` nem confundir resultados dessa busca com a equipe da obra atual.
- Para excluir, consultar nome/cargo/vínculos e explicar perda do cadastro e limpeza das atribuições, mantendo ocorrências/autorias/aceitações. Cancelar/Escape não envia DELETE. Confirmar usa `DELETE /trabalhadores/{id}/`, **sem corpo de confirmação obrigatório**.
- Aqui o sucesso é **`200`**, com `mensagem`, `id`, `ocorrencias_sem_responsavel`; não aplicar a exigência `204` dos UCs de cascata. Atualizar listas/seletores/ocorrências e mostrar a quantidade retornada. Tratar `409` de concorrência, `422`, `400`/`404`, `503` e falha de conexão sem sucesso falso.

**4. Pronto quando**

Dados corrigidos persistem; lista de vínculos é substituída integralmente e pode ficar vazia sem apagar cadastro. Cancelar exclusão não envia DELETE; confirmar remove a pessoa e preserva os problemas e suas decisões. **Após correção do backend**, retirar obra A limpa atribuição em A e preserva a de B; excluir pessoa limpa ambas, guardando responsável anterior. Formulário de ocorrência aberto antes da mudança não restaura atribuição antiga por gravação obsoleta.

**5. Testes relacionados**

CT-96 a CT-101, CT-99 para cancelamento/exclusão e CT-100 para cascata de obra. Backend: `tests/trabalhadores/test_manutencao.py`, `test_rotas.py`, `test_responsaveis.py`, `test_persistencia_atlas.py`. **Atenção:** testes atuais de `test_responsaveis.py` exigem manutenção da atribuição ao desvincular; precisam ser atualizados à nova decisão, não citados como evidência de que ela já funciona. **FE-UC-20 proposto:** A/B, lista vazia, relink por busca, contagem do DELETE e ocorrência aberta em outra aba durante desvinculação/exclusão.

**6. Dependências**

UC-19/03 e UC-14/15 para observar os efeitos. **Bloqueio de backend:** implementar limpeza transacional de atribuição na retirada de vínculos, preservar `responsavel_anterior`/histórico e garantir proteção contra formulários obsoletos, inclusive na exclusão. Código consultado não incrementa a versão da ocorrência na limpeza; a equipe do backend precisa definir/aplicar o controle coerente com UC-15. Reconciliar README, P-10, matriz e testes. Edição descritiva pode avançar; nenhum efeito pendente deve ser fingido no navegador.

## [Frontend][UC-21] Consultar dados simulados do comprador e do engenheiro

**1. Contexto e cobertura**

Confirmado: apresentar exemplos pré-carregados, somente leitura, contextualizados e visivelmente simulados. Cobre **F-17, F-18, RN-10, CA-08**, além de CA-05 para edição do exemplo de engenheiro. Backend possui consulta e procedimento de carga. Proposta: usar a aba existente e componentes de leitura reutilizáveis nos detalhes.

**2. Arquivos previstos**

- Existentes: `src/features/simulados/pages/SimuladosPage.jsx`, rotas do módulo, detalhe de marco/avanço e páginas de publicações/versões.
- Proposta: `src/features/simulados/api.js`, `src/features/simulados/components/ExemplosSimulados.jsx`, `tests/e2e/uc-21.spec.js`.
- Reutilizar mídia/avanço de UC-08, atualização de UC-10 e comparação de UC-11.

**3. Fazer**

- Consultar `GET /obras/{obraId}/feedback-simulado`. Mostrar `aviso`, `simulado`, `somente_leitura`, `feedbacks`, `avancos_simulados` e totais pertinentes. Marcar os exemplos individualmente como simulados, além do aviso da seção.
- Apresentar avaliação, compreensão e dúvida com origem fictícia, `alvo.rotulo`, tipo de alvo e conteúdo retornado; não inventar nota/escala, persona autenticada ou texto para preencher ausência.
- Usar somente filtros implementados: `tipo` (`avaliacao`, `compreensao`, `duvida`), `alvo` (`obra`, `marco`, `atualizacao`), `marco_id`, `avanco_id`, `secao` (`comprador`, `engenheiro`). São possibilidades da API, não obrigação de criar um painel com todos os filtros.
- Em detalhe de marco/atualização, aplicar o ID do contexto. `marco_id` seleciona exemplos daquele marco, não todos os exemplos de suas atualizações; `avanco_id` seleciona a atualização exata. `tipo`/`alvo` só filtram feedback do comprador; usar `secao` para pedir uma lista específica.
- Para engenheiro, apresentar origem simulada e estado real do avanço, sem sessão própria. Se houver correção pela construtora, usar `editado_pela_construtora`, `correcao` e `comparacao` para abrir as versões de UC-11, mantendo autoria original/texto anterior.
- Mostrar vazio real quando não houver exemplos. Tratar `400`, `404 ALVO_FORA_DA_OBRA`/`ALVO_FORA_DO_MARCO`, `422 FILTRO_INVALIDO`/`FILTRO_DESCONHECIDO` e falhas de consulta sem trocar por conteúdo inventado. Exemplos inconsistentes omitidos pela API não devem ser reconstruídos a partir de cache.
- Não oferecer criar/editar feedback, comentar, aceitar como comprador nem login desses perfis. Métodos de escrita nessa rota retornam `405 INTERACAO_NAO_DISPONIVEL`; a interface é de leitura.

**4. Pronto quando**

Os três tipos de feedback aparecem no alvo correto e sempre identificados como simulação. Exemplo de engenheiro corrigido distingue origem de autoria da edição e abre comparação real. Ausência de carga mostra vazio; exclusão do alvo retira exemplos dependentes após reconsulta. Não há formulário de interação real desses perfis.

**5. Testes relacionados**

CT-102 a CT-106 e CT-50. Backend: `tests/test_dados_simulados.py`, `app/simulados/routes.py`/`service.py`; carga em `scripts/carregar_dados_demonstracao.py`. **FE-UC-21 proposto:** filtro de contexto exato, selo persistente na comparação, ausência de formulário/POST e exemplos excluídos saindo do cache.

**6. Dependências**

UC-03/05/08/10/11 e carga prévia executada pelo responsável do backend. Não carregar exemplos fabricados no bundle para substituir a API. Exemplo de engenheiro sem mídia válida pode ser legível, mas não satisfaz CT-50 de correção; preparar um avanço publicado com mídia recuperável. UC-17/18 validam a remoção dos exemplos associados.

## Ordem sugerida de implementação

Esta ordem segue dependências de fluxo; não é uma estimativa de prazo nem uma nova redução do MVP.

1. **UC-01 → UC-03 (consulta de detalhe) → UC-02 → completar UC-03 → UC-05.** Reaproveitar login/lista existentes e demonstrar obra/marco criados e recuperados no navegador. Começar pelo detalhe de UC-03 evita que UC-02 navegue para uma área sem dados.
2. **UC-06 → UC-08 → UC-09 → UC-10.** Entregar dependências e a confirmação compartilhada; depois mídia real, revisão e publicação. Validar Cloudinary/proxy cedo e repetir a trilha mínima no EC2; não deixar o primeiro upload real para o encerramento.
3. **UC-07 → UC-12 → UC-04.** Confirmação de conclusão com dependências, mudanças com motivo e edição descritiva separada. UC-04 pode avançar assim que UC-03 existir, finalizando a ligação a UC-12 depois.
4. **UC-11 → UC-13.** Correção publicada e comparação primeiro; histórico unificado reutiliza esses componentes e os eventos de UC-07/12.
5. **UC-19 → UC-14 → UC-15 → UC-16.** Equipe habilita seleção de responsável; ocorrência sem opcionais pode começar antes de UC-19. A mesma base atende transições e aceitações sem duplicar componentes.
6. **UC-20**, com correção de backend iniciada desde o primeiro ciclo, em paralelo ao trabalho de frontend independente. Não aguardar esta posição para comunicar o bloqueio. Edição de dados pode ser integrada antes; desvinculação só fecha com a regra confirmada e os testes ajustados.
7. **UC-21 → UC-17 → UC-18.** Preparar exemplos e validar as exclusões sobre registros descartáveis completos, incluindo versões, aceitações e dados simulados. O tratamento de rascunhos já vem de UC-09.
8. **Encerrar CT-111 nos próprios cartões:** executar no EC2 o percurso UC-01 → UC-02 → UC-05 → UC-08 → UC-10 → UC-12 → UC-14 → UC-16; acrescentar consulta UC-03/13, correção UC-11 e os demais desvios de cada cartão. Recarregar/reiniciar, abrir mídia real, registrar evidências e confirmar ausência de segredos no cliente. Não encerrar cartão pela existência de mocks ou de um teste de API isolado.

UC-03 pode ser validado inicialmente com obras já persistidas e revalidado depois de UC-02. A ordem é sugerida e não impõe um único responsável ou trabalho simultâneo da equipe.
