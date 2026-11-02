# Projeto Ágil — frontend

Frontend React + Vite do mesmo produto de `programacao-eficaz-projeto3` (Flask).
Nesta cópia, o backend está em `../backend-pe03`.

## Executar

Requer Node.js 22.12+ e npm. Verificado com Node 24.14.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Inicie o backend conforme seu README para usar login e listagem de obras.
O proxy de desenvolvimento encaminha `/api` a `http://127.0.0.1:5000`, removendo
esse prefixo. Altere `API_PROXY_TARGET` para outro servidor Flask.

```powershell
npm run build
npm run preview
npm test
```

O build fica em `dist/`. Em produção, configure fallback para `index.html` nas
rotas React e proxy de `/api/*` ao Flask, removendo `/api`. O servidor de
desenvolvimento e o preview do Vite usam `API_PROXY_TARGET`; esse proxy não faz
parte dos arquivos estáticos de `dist/`.
Variáveis `VITE_*` são públicas. Credenciais de banco, Cloudinary e chave JWT
ficam exclusivamente no backend.

Exemplo Nginx no servidor que publica `dist/` (ajuste o diretório e o Flask):

```nginx
server {
    listen 80;
    root /var/www/frontend/dist;
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache off;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Publique com HTTPS no endereço público. O fallback é apenas para navegação:
erros de `/api/` devem continuar sendo respostas do Flask, nunca `index.html`.
Por padrão o cliente usa `/api` na mesma origem. Para API em outra origem,
configure `VITE_API_BASE_URL=https://api.exemplo.com` **antes de construir** e
autorize no CORS do Flask a origem do frontend, o cabeçalho `Authorization`,
`Content-Type`, os métodos necessários e preflight `OPTIONS`. A URL é pública;
alterá-la após o build exige reconstruir o frontend. `API_PROXY_TARGET` configura
somente o processo Vite e não entra no bundle.

## Organização

```text
src/
  main.jsx
  app/
    router.jsx           # Inicialização do BrowserRouter
    routes.jsx           # Composição das rotas e Suspense
    layouts/             # Cabeçalho e navegação dentro da obra
    app.css
  shared/
    api/http.js          # Bearer token, JSON, FormData e erros
    ui/                  # Componentes reutilizáveis
    styles/global.css    # Base visual da referência
  features/
    auth/
    obras/
    marcos/
    avancos/
    publicacoes/
    ocorrencias/
    trabalhadores/
    historico/
    simulados/
```

Cada funcionalidade declara suas rotas em `routes.jsx`, carrega páginas sob
demanda e mantém consultas em `api.js` quando implementadas. Componentes de
negócio ficam dentro da funcionalidade; componentes compartilhados não acessam
dados de negócio diretamente. Criar novas camadas conforme a necessidade,
evitando um contexto global com todas as entidades e CRUD local genérico.

## Rotas do frontend

São endereços de navegação, distintos dos endpoints Flask. Na tabela, `…`
representa o prefixo `/obras/:obraId`.

| Área | Caminhos |
| --- | --- |
| Acesso | `/login` |
| Obras | `/obras`, `/obras/nova`, `…/editar` |
| Marcos | `…/marcos`, `…/marcos/novo`, `…/marcos/:marcoId`, `…/marcos/:marcoId/dependencias` |
| Avanços | `…/marcos/:marcoId/avancos`, `…/marcos/:marcoId/avancos/novo`, `…/avancos/:avancoId`, `…/avancos/:avancoId/editar` |
| Publicações | `…/publicacoes`, `…/avancos/:avancoId/publicar`, `…/avancos/:avancoId/corrigir`, `…/avancos/:avancoId/versoes` |
| Ocorrências | `…/ocorrencias`, `…/ocorrencias/nova`, `…/ocorrencias/:ocorrenciaId`, `…/ocorrencias/:ocorrenciaId/editar`, `…/ocorrencias/:ocorrenciaId/aceitacoes` |
| Trabalhadores | `…/trabalhadores`, `…/trabalhadores/novo`, `…/trabalhadores/:trabalhadorId`, `…/trabalhadores/:trabalhadorId/editar` |
| Histórico | `…/historico`, `…/historico/nova-mudanca`, `…/historico/:mudancaId` |
| Simulados | `…/simulados` |

`/` encaminha a `/obras`; `/obras/:obraId` abre os marcos. Rotas de negócio
exigem sessão e preservam o destino ao encaminhar ao login. Endereços
desconhecidos exibem 404. O backend continua responsável por autorização e por
verificar o pertencimento dos registros à obra em cada operação.

## Estado desta entrega

- Estrutura Vite, rotas aninhadas, carregamento por módulo, navegação, 404 e
  tratamento de erro de rota implementados.
- Login: `POST /construtora/login/`; restauração: `GET /sessoes/atual`;
  logout: `POST /construtora/logout/`; listagem: `GET /obras`, com estados de
  carregamento, vazio e erro com nova tentativa.
- UC-01: token de acesso em memória e `sessionStorage`; 401 autenticado encerra
  a sessão local e orienta novo login. Expiração exige novo login, conforme o
  cartão; refresh automático não faz parte desta entrega. Senha e refresh token
  não são persistidos pela aplicação. O gerenciador de senhas do navegador segue
  a preferência do usuário.
- Durante a restauração, conteúdo protegido não é montado. Destino protegido
  preserva caminho, consulta e fragmento. Logout aguarda confirmação da API;
  rede/5xx permitem tentar novamente, sem anunciar saída. Na restauração,
  falhas temporárias preservam o token e exibem uma tela de nova tentativa sem
  revelar conteúdo protegido. Recarregar sem cache (Ctrl + Shift + R) também
  restaura a sessão. Após saída/401, dados
  protegidos são desmontados; retorno pelo histórico continua exigindo sessão.
  Páginas recuperadas do cache de histórico revalidam a sessão antes de exibir dados.
- UC-02: formulário em `/obras/nova`, com revisão e confirmação, cadastro por
  `POST /obras` e consulta do detalhe por `GET /obras/{id}` na área da obra.
  O cabeçalho e os dados do cadastro vêm dessa consulta, inclusive após recarga.
  Voltar ao painel consulta novamente a listagem. As outras áreas permanecem
  identificadas como **Em preparação**.
- Base visual e `UI.jsx` reaproveitados da referência local
  `C:/Users/Victor_ms/Downloads/projeto-agil-vscode/projeto-agil`.

## Continuar o desenvolvimento

Consultar README, código e testes do backend antes de implementar cada fluxo.
Somente a construtora autentica. Evidências pertencem a avanços ou ocorrências;
dependências são entre marcos. Preservar rascunhos, publicações, versões,
motivos e confirmações conforme os contratos reais. Tratar conflitos e limpeza
pendente sem indicar sucesso falso.

Próximas entregas: dependências, transições de estado e registro de
avanço com mídia até publicação e prévia.

## Verificação do UC-01

```powershell
npm test
npx playwright install chromium
npm run test:all
```

`npm test` preserva os quatro testes HTTP originais, acrescenta cobertura de
envelopes, campos/códigos e falhas de transporte e verifica as rotas protegidas.
`npm run test:e2e` usa Playwright, constrói e serve o frontend automaticamente,
testando o build e o fallback de uma rota aninhada. Segue a configuração de
[webServer do Playwright](https://playwright.dev/docs/test-webserver).
Se Chrome já estiver instalado, é possível dispensar o download de Chromium:

```powershell
$env:E2E_BROWSER_CHANNEL = 'chrome'
npm run test:all
```

`tests/e2e/uc-01.spec.js` cobre acesso direto/retorno ao destino, recarga,
restauração em andamento ou com falha, credenciais inválidas, falha de rede,
401 autenticado, logout aguardando revogação, falha de logout e histórico.
Por padrão, a API é controlada pelos testes; isso verifica o frontend, sem
atestar a conta real nem o servidor implantado.

Para verificar o contrato real, provisione no servidor a única conta funcional
e `CONSTRUTORA_ID`, inicie Flask e injete as variáveis abaixo no **processo de
testes**, por ambiente seguro, sem salvá-las no código nem em variáveis `VITE_*`:

- `E2E_REAL=1`: habilita o cenário integrado, sem interceptar API.
- `E2E_EMAIL` e `E2E_PASSWORD`: conta provisionada, usadas somente pelo teste.
- `E2E_BASE_URL`: endereço integrado do frontend (por exemplo, o EC2 com HTTPS).
  Sem essa variável, o teste inicia Vite local com o proxy configurado.
- `E2E_BROWSER_CHANNEL=chrome`: opcional, para usar Chrome instalado.

Execute `npm run test:e2e`. O cenário real testa senha errada, login, destino,
recarga, logout e **401 ao reutilizar o token antigo em `/sessoes/atual`**,
além de `/obras` sem sessão. Ele não cria nem exclui obras; o destino aninhado
usa um ID fictício e pode apresentar erro na consulta da obra; os testes de
autenticação não dependem de uma obra real. Traces e screenshots ficam desabilitados
nesse modo para não gravar credenciais/tokens. Não compartilhe a conta durante
a execução, pois o teste encerra a sessão que criou.

Rastreabilidade: F-01/RN-10/CA-01 → UC-01 → CT-01 a CT-04. Autorização de
leitura/escrita permanece no backend; CT-03 em todos os recursos é coberto por
`tests/autenticacao/` e `tests/infraestrutura/test_rotas_api.py` do backend.
O modo real no endereço publicado verifica a parcela de acesso do CT-111;
o CT-111 completo depende dos demais UCs, Atlas e da API externa.

Validação local em 02/11/2026: build concluído, 8 testes HTTP/rotas e 13 cenários
de navegador aprovados com Chrome; no backend, 130 testes de autenticação e
`test_rotas_api.py` aprovados com banco simulado. O cenário integrado real ficou
sem execução por ausência de `E2E_EMAIL`, `E2E_PASSWORD` e endereço implantado
configurados. Portanto, revogação contra a API publicada e aceite no EC2 ainda
precisam dessa execução; testes controlados não substituem essa evidência.

## Cadastro de obra — UC-02

Contrato conferido em `../backend-pe03/docs/05-arquitetura-e-contratos.md`,
`app/obras/{routes,service,validacoes}.py` e nos testes de cadastro. O corpo
contém somente nome, tipo (`casa`/`apartamentos`), cliente de referência,
localização em texto livre, descrição, início e entrega. Estado e auditoria
pertencem ao servidor. Não há cadastro de comprador nem consulta de CEP.

O seletor `PrazoEntregaFields` descarta os campos da modalidade anterior.
Data exata envia apenas modalidade/data; intervalo envia modalidade/início/fim.
Validação aceita dias existentes em `AAAA-MM-DD`, inclusive intervalo de um
dia, sem impor relação entre início da obra e entrega. Datas são formatadas
como dias de calendário sem conversão de fuso.

O envio exige revisão, bloqueia cliques duplicados e só navega ao receber 201
com ID. A área consulta o detalhe; erro nessa consulta permite repetir somente
o GET. Erros 422 mostram mensagem/campos e preservam os dados para correção.
Falhas de persistência, conexão ou resposta incompleta orientam consultar a
lista antes de repetir, pois o POST não é idempotente. Não há retry automático
nem cadastro temporário apresentado como salvo. Cancelar retorna ao painel.

`tests/e2e/uc-02.spec.js` cobre CT-05 a CT-10 na camada de interface com API
controlada: casa/data exata, apartamentos/intervalo de um dia, revisão,
recarga, nova consulta da lista, alternância repetida, textos vazios, data
inválida, intervalo invertido, cancelamento, clique duplicado, 422, 500,
conexão e resposta perdida após gravação, resposta sem ID/status inesperado e
falha de consulta após criação. `tests/datas.test.js` cobre o calendário.

Executar com `npm run test:all` (use `E2E_BROWSER_CHANNEL=chrome` para Chrome
instalado). Os testes controlados não comprovam persistência no Atlas após
reinício nem CT-111 no EC2. Para CT-09 real, o backend fornece
`python -m pytest tests/obras/test_cadastro_atlas.py --atlas -q`, usando coleções
temporárias; CT-111 continua dependendo do fluxo completo e da mídia real.

Verificação local de UC-02 em 02/11/2026: build aprovado, 9 testes de
datas/HTTP/rotas e 26 cenários de navegador UC-01/02 aprovados com Chrome.
No backend, 79 testes de cadastro/validações aprovados com banco simulado.
O cenário real de autenticação e o teste de reinício no Atlas foram omitidos
por serem opt-in. A suíte de navegador foi concluída contra o preview local
com `E2E_BROWSER_CHANNEL=chrome` e `E2E_BASE_URL=http://127.0.0.1:4173`.

Correção de recarga sem cache: a restauração preserva o token em falhas de
rede, 5xx ou resposta incompleta e permite nova tentativa. Sessão expirada ou
revogada continua exigindo login. No backend, a consulta da sessão passou a
aceitar o login legado sem `CONSTRUTORA_ID`, conforme a compatibilidade já
oferecida no login; reinicie Flask para aplicar essa alteração. O teste de
navegador usa `Page.reload` com `ignoreCache: true` para cobrir Ctrl + Shift + R.

## Listar, filtrar e consultar obras — UC-03

`/obras` oferece nome, cliente de referência, os quatro estados do contrato,
alerta `atrasada` e limites de entrega/registro. A aplicação envia cada filtro
uma vez e omite vazios; textos são enviados literalmente, sem criar regex.
O botão Aplicar filtros permite combinar critérios antes de consultar. A URL
registra a busca aplicada; recarga, histórico do navegador e o botão de volta
no detalhe permitem retomá-la. Os chips representam `filtros_aplicados` da API
e permitem remover um critério; Limpar filtros reinicia a busca.

Nome/cliente têm correspondência parcial literal sem distinção de caixa no
servidor. Os filtros combinam por interseção. Limites de data são inclusivos;
entrega estimada considera o fim do intervalo e registro considera o dia UTC.
O frontend valida dias existentes e intervalos, mas não filtra, reordena ou
recalcula os resultados recebidos. Estado e alerta aparecem separados; datas
passadas não criam um alerta local. A conclusão vem de `data_conclusao`, sem
inventar valores para registros legados.

A tela diferencia `lista_vazia`, `sem_resultados`, carregamento e erro. Erros
422 exibem mensagem e campos associados. URLs com filtros repetidos são
sinalizadas antes da consulta; aplicar novamente normaliza os parâmetros,
sem mandar filtros repetidos à API. Falhas de conexão/500 permitem nova
tentativa sem representar uma lista vazia. Respostas incompletas também são
tratadas como erro.

`ObraLayout` consulta `GET /obras/{id}`, mostra os dados do cadastro e mantém
as abas de cada UC. O parâmetro de navegação `busca` preserva a volta aos
filtros mesmo após recarregar o detalhe e não é enviado à API. O cadastro fica
disponível aos componentes filhos por `useOutletContext().obra`, sem outra
consulta ou contexto global. Respostas antigas são canceladas e ignoradas;
ao trocar de obra, o cabeçalho anterior deixa de aparecer imediatamente.
Erros 400/404/500 exibem estado próprio sem manter as áreas da obra anterior.

Contratos consultados: `../backend-pe03/docs/02-dominio-e-regras.md` (RN-02),
`docs/04-jornadas-e-aceite.md` (CA-02), `docs/08-casos-de-uso-mvp.md` (UC-03),
`app/obras/{routes,service}.py` e `app/dominio/obras.py`. Testes de referência:
`tests/obras/test_consultas.py`, `test_filtro_alertas.py` e
`tests/mudancas/test_mudancas.py`. Esses caminhos de contrato/testes são
relativos ao backend.

O design mantém a identidade visual existente: ação principal contrastante,
filtros agrupados, datas em seção expansível, cartões clicáveis com cliente e
prazo, contagem de resultados e feedback explícito de carregamento/erro.
Estado usa etiquetas com texto e cor; atraso tem indicador próprio e ícone,
sem depender apenas da cor. Layout verificado em desktop e celular, com foco
de teclado visível e mensagens associadas aos campos.

Referências de design consultadas em 02/11/2026:

- [NN/g — User Intent Affects Filter Design](https://www.nngroup.com/articles/applying-filters/): aplicação conjunta dos critérios de busca.
- [NN/g — Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/): feedback de carregamento e do resultado das ações.
- [GOV.UK — Tag](https://design-system.service.gov.uk/components/tag/): indicadores de estado informativos, separados das ações.
- [GOV.UK — Details](https://design-system.service.gov.uk/components/details/): revelar opções adicionais mantendo a área principal mais simples.
- [GOV.UK — Error summary](https://design-system.service.gov.uk/components/error-summary/): resumo com foco e associação aos campos com erro.

`tests/e2e/uc-03.spec.js` cobre filtros isolados/combinados, omissão de vazios,
parâmetros únicos, chips, estados vazios, navegação/recarga, conclusão retornada
e legada, erros e respostas fora de ordem, mesmo quando o transporte ignora o
cancelamento. `tests/filtros-obras.test.js` cobre serialização, repetição e datas.
Esses cenários usam API controlada. O aceite integrado CT-111 no EC2 e os testes
de persistência/transações reais no Atlas continuam exigindo execução própria.

Verificação local de UC-03 em 02/11/2026: build aprovado, 12 testes de
datas/filtros/HTTP/rotas e 51 cenários de navegador UC-01/02/03 aprovados com
Chrome. O cenário de autenticação real permaneceu opt-in. No backend, os três
arquivos de referência somaram 112 testes aprovados e seis cenários Atlas
omitidos. Banco e respostas do navegador foram simulados nessas execuções.

## Editar dados descritivos da obra — UC-04

O botão Editar obra no resumo abre `/obras/{id}/editar`, preservando a busca
de UC-03. A tela consulta o cadastro antes de oferecer o formulário. Somente
nome, cliente de referência, localização em texto livre e descrição são
editáveis. `ObraDescritivaFields` compartilha os quatro campos com UC-02;
`descritiva.js` valida textos preenchidos e seleciona apenas as diferenças.

Salvar envia `PATCH /obras/{id}` com os campos descritivos alterados, sem
tipo, início, prazo, estado, conclusão, alertas ou auditoria. Espaços nas
extremidades são aparados; ausência de mudanças desabilita o envio. Durante
o salvamento, campos, cancelamento e botão de salvar ficam bloqueados, com
proteção adicional contra cliques duplicados. Cancelar retorna ao detalhe
sem PATCH. Respostas de uma edição abandonada não redirecionam outra página.

O `200` do backend contém ID e os quatro campos descritivos. Essa resposta
parcial não substitui a obra completa: a tela retorna ao detalhe e consulta
novamente o cadastro, recuperando planejamento, alertas, conclusão e demais
dados. O painel também consulta novamente ao retornar. Falha na releitura
mostra erro de consulta e permite repetir o GET sem repetir o PATCH.

Erros 400 e 404 identificam referência inválida ou obra indisponível; 422
mostra mensagem/campos e 500 distingue falha de carregamento e de gravação.
Durante falha na gravação, o formulário preserva os textos digitados e não
anuncia sucesso. Falha de conexão ou resposta incompleta orienta consultar a
obra antes de salvar novamente, sem retry automático.

O painel lateral exibe o planejamento apenas para consulta e oferece
Registrar mudança para `/obras/{id}/historico/nova-mudanca`. Esse é o caminho
de UC-12, que exige motivo, versão e histórico; o formulário compartilhado
permite alterar entrega/estado da obra e período/estado dos marcos. A edição descritiva funciona de forma
independente e não implementa um atalho para alterar prazo/situação.

Contrato conferido em `../backend-pe03/app/obras/{routes,service}.py`, nos
documentos de domínio (RN-07), jornadas (CA-02) e casos de uso (UC-04).
Testes de referência do backend: `tests/obras/test_edicao.py` e
`tests/obras/test_edicao_atlas.py` (CT-16/CT-17). Os cenários reais Atlas usam
coleções temporárias e continuam opt-in, sem serem substituídos pelos mocks.

`tests/e2e/uc-04.spec.js` cobre cada campo, resposta parcial, releitura,
retorno ao painel, cancelamento, ausência de mudanças, textos vazios,
carregamento, envio duplicado, erros, falha de releitura e navegação para
UC-12. Também gera capturas desktop/celular para revisão visual.
`tests/descritiva.test.js` verifica as diferenças permitidas e a exclusão de
campos controlados pelo servidor. Executar com `npm run test:all`.

Verificação local em 02/11/2026: build aprovado, 13 testes unitários/rotas e
74 cenários de navegador UC-01/02/03/04 aprovados com Chrome, incluindo revisão
visual desktop/celular. A autenticação real permaneceu opt-in. No backend,
29 testes de edição aprovados com banco simulado; três cenários Atlas omitidos.
Persistência real no Atlas e CT-111 no EC2 ainda exigem execução integrada.

## Perspectiva ilustrativa do projeto — extensão de UC-02/03/04

Extensão confirmada pelo usuário em 02/11/2026: uma imagem JPEG/PNG opcional
de como a obra ficará pronta. No cadastro, a seleção tem prévia e participa
da revisão. Sem imagem, a criação continua JSON; com imagem, usa multipart
com `cadastro` (JSON textual) e o arquivo `imagem_projeto`. O backend salva a
referência junto ao cadastro; o frontend não apresenta prévia como imagem
persistida nem cria a obra antes de tentar enviar a imagem.

Cartões e detalhe exibem a legenda Perspectiva ilustrativa do projeto,
separada das evidências reais. Conteúdo privado é recuperado por `request`
com Bearer e convertido em Blob; token e URL assinada não aparecem no `src`
da imagem. URLs temporárias são liberadas quando a imagem/tela é substituída.
Falha na imagem mantém os demais dados disponíveis e permite nova consulta.
Obras antigas ou cadastradas sem imagem continuam com a apresentação textual.

A edição possui um painel próprio para adicionar, substituir ou remover a
perspectiva. A imagem é salva separadamente dos textos; o PATCH descritivo
mantém seus quatro campos. Substituir/remover usa o ID da imagem consultada;
`409` e falhas com resultado indeterminado exigem consultar a imagem atual
antes de reenviar. Remoção pede confirmação. Limpeza pendente é apresentada
como pendência, sem anunciar que o arquivo anterior foi definitivamente apagado.

O servidor valida conteúdo e tamanho (padrão 10 MiB, configurável); o navegador
permite selecionar JPEG/PNG e oferece prévia. Não se aceitam URLs externas ou
referências de Cloudinary no formulário. Credenciais continuam exclusivamente
no backend. Ver o [contrato completo](../backend-pe03/docs/05-arquitetura-e-contratos.md#imagem-opcional-do-projeto--extensão-de-uc-020304).

Testes novos: `tests/e2e/imagem-projeto.spec.js` para cadastro, revisão,
exibição autenticada, recarga, cancelamento, falhas, substituição, confirmação
de remoção e conflitos; `tests/http.test.js` verifica o transporte binário
autenticado e erros JSON. São cenários com API controlada; o upload e a
recuperação com Cloudinary real ainda precisam de validação integrada.

Verificação desta extensão: build aprovado, 14 testes unitários/rotas e
82 cenários de navegador aprovados (incluindo oito de imagem). No backend,
348 testes de obras/mídia/cascata/rotas passaram com provedores simulados;
11 cenários de integração real ficaram opt-in. As novas rotas exigem reiniciar
o backend. As credenciais Cloudinary devem estar somente no `.env` do servidor.

## Criar e consultar marcos — UC-05

Contrato conferido em `../backend-pe03/app/marcos/{routes,service,validacoes}.py`,
`tests/marcos/{test_cadastro,test_consultas}.py` e nas regras RN-03/CA-03.
Marcos pertencem diretamente à obra, sem entidade etapa e sem percentual
calculado pela quantidade de entregas.

- Lista: `GET /obras/{obraId}/marcos`, com resposta em array (inclusive `[]`).
- Detalhe: `GET /obras/{obraId}/marcos/{marcoId}`, inclusive no acesso direto e
  após recarga. O vínculo `obra_id` e o ID consultado são conferidos antes da
  exibição. A resposta completa, incluindo `versao`, permanece no estado da consulta.
- Cadastro: `POST /obras/{obraId}/marcos`, somente com `nome`, `descricao`,
  `inicio_previsto` e `fim_previsto`. Textos são obrigatórios e enviados sem
  espaços nas pontas; datas são dias válidos, com fim maior ou igual ao início.
  Estado inicial `a iniciar` é responsabilidade do servidor.
- Somente `201` confirma criação: a interface abre o ID retornado, consulta o
  detalhe e reconsulta a lista. Falha nessa reconsulta possui nova tentativa e
  não desfaz nem oculta a confirmação do cadastro.
- Carregamento, lista vazia, falha HTTP/rede e resposta inesperada têm feedback
  distinto. `422` identifica os campos; `400`, `404` e `500` preservam a mensagem
  da API. Cancelar o formulário não envia POST. Envios simultâneos são bloqueados.
- Troca de obra descarta a consulta anterior, aborta requisições e reinicia o
  formulário. A busca do painel permanece nos links internos.
- `MarcoSelect` está disponível para os próximos UCs; consulta por obra, limita
  as opções ao resultado atual e apresenta carregamento, vazio e nova tentativa.
  O consumidor recebe o ID em `onChange` e deve validar a seleção no seu comando.
- Dependências e avanços possuem links para as rotas existentes; os comandos
  dessas áreas continuam para os respectivos cartões.

A interface mantém Inter, azul, fundo claro, cartões arredondados e componentes
existentes. Prioriza nome, estado e período, com ação de cadastro no estado vazio
seguindo a orientação sobre [estados vazios do Nielsen Norman Group](https://www.nngroup.com/articles/empty-state-interface-design/).

```powershell
$env:E2E_BROWSER_CHANNEL = 'msedge' # ou chrome/Chromium instalado
npx playwright test tests/e2e/uc-05.spec.js
```

Os 13 cenários de `tests/e2e/uc-05.spec.js` usam API controlada e cobrem array,
criação, payload, cancelamento, datas iguais/invertidas, erros, recarga, isolamento
por obra e resposta atrasada. Geram capturas desktop/mobile em `test-results/`.
Não comprovam persistência Atlas após reinício nem CT-111 no servidor publicado.
O Python de `../backend-pe03/venv` não pôde ser executado nesta máquina; os testes
do backend foram consultados, mas não reexecutados nesta entrega.

Validação local em 02/11/2026: build aprovado, 14 testes unitários/contratuais
aprovados e suíte de navegador com 100 cenários aprovados (incluindo os 13 do
UC-05) e 1 cenário de integração real ignorado por ser opt-in. Navegador: Edge.
Nesta máquina, o encerramento automático do servidor Vite pelo Playwright não
terminou; a execução completa foi concluída com preview iniciado separadamente
e `E2E_BASE_URL=http://127.0.0.1:4174`. As capturas de lista, cadastro e detalhe
foram inspecionadas, incluindo largura de 390 px sem rolagem horizontal.

## Limite da verificação de sessão

A restauração em `AuthProvider` aguarda `GET /sessoes/atual` por até 8 segundos,
incluindo leitura do corpo. Se exceder esse prazo, cancela a consulta, mantém o
token e apresenta nova tentativa. Respostas atrasadas ou de uma tentativa anterior
não liberam conteúdo protegido. Desmontagem e navegação cancelam a consulta e
limpam o temporizador. Respostas 401/403 e 422 de JWT inválido nessa consulta
exigem novo login. O 422 de validação dos formulários não encerra a sessão.
Esse limite evita espera indefinida; não reduz o tempo de processamento do
servidor. Para investigar latência real, medir `/sessoes/atual` no ambiente em uso
e a conexão do backend com MongoDB. O teste de timeout usa relógio controlado.

## Rolagem nas abas da obra

Trocar as seções da mesma obra preserva a posição vertical da página. A área
abaixo das abas mantém pelo menos a altura do conteúdo anterior, evitando que
uma seção curta reduza a página e desloque a leitura. Esse espaço é reiniciado
ao abrir outra obra. O carregamento dos módulos fica dentro dessa área, mantendo
cabeçalho e navegação montados. Navegar ao painel ou a um formulário/detalhe
continua abrindo no topo. Os testes de UC-03 verificam trocas de conteúdo longo
para curto em desktop e celular, preservação da busca e retorno ao painel.

## Definir e retirar dependências — UC-06

Contrato conferido em `../backend-pe03/app/marcos/{routes,service}.py`,
`tests/marcos/test_dependencias.py`, RN-04/CA-03 e no cartão frontend UC-06.
A página valida primeiro o pertencimento do marco à obra pelo detalhe de UC-05;
somente então consulta os endpoints de dependências, que não recebem obraId.

- `GET /marcos/{marcoId}/dependencias` retorna array e é a fonte dos vínculos.
  A interface mostra `marco_nome depende de depende_de_nome`, inclusive no detalhe
  do marco. Respostas com envelope ou referência a outro marco viram erro.
- Os candidatos vêm de `GET /obras/{obraId}/marcos`. `MarcoSelect` aceita fonte
  compartilhada e exclusões; oculta o próprio marco e pré-requisitos já escolhidos.
  A prévia textual mostra a direção da relação antes de adicionar.
- `POST /marcos/{marcoId}/dependencias` envia somente `{depende_de_id}` e exige
  `201` com vínculo completo e correspondente à seleção. Em seguida reconsulta
  vínculos e candidatos; não há representação otimista de uma relação rejeitada.
- `DELETE /marcos/{marcoId}/dependencias/{dependenciaId}` usa o ID do vínculo,
  não o marco de destino, e exige `204`. Só remove a relação; os marcos permanecem.
  A confirmação identifica ambos os nomes e permite Cancelar/Escape antes do envio.
- `ConfirmDialog` é reutilizável, usa diálogo modal nativo, foco inicial no botão
  Cancelar, circulação de Tab/Shift+Tab, Escape, fundo inerte e devolução de foco.
  Se o acionador desaparecer, usa o título da seção como destino de foco.
  Durante um comando em curso, os botões e Escape não iniciam outra operação.
- Mensagens de `400`, `404`, `422`, `409` e banco/rede são preservadas. Após falha
  de comando, a interface pede nova consulta antes de outra alteração, descartando
  a confirmação anterior. Conflitos não são reenviados automaticamente.
- Autorreferência, duplicação, ciclos diretos/indiretos e concorrência continuam
  validados no servidor; o frontend não implementa um grafo de regras.

A composição mantém cores, tipografia e cartões do site, com lista de relações
junto ao formulário e uma prévia curta. A confirmação segue o
[padrão de diálogos da W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
e a direção explícita e a filtragem ajudam na
[prevenção de erros descrita pelo NN/G](https://www.nngroup.com/articles/user-mistakes/).

Os testes de `tests/e2e/uc-06.spec.js` usam API controlada e verificam nomes,
direção, seleção, recarga, ID de retirada, foco/teclado, cancelamento, conflitos,
respostas inesperadas, falhas de consulta, candidatos ausentes e troca de contexto.
As capturas desktop/mobile ficam em `test-results/` (não versionadas).
Essa verificação não comprova Atlas ou persistência após reinício do servidor;
o backend foi consultado e preservado nesta entrega.

Validação local do UC-06 em 02/11/2026: build aprovado, 14 testes unitários/
contratuais aprovados e 128 cenários de navegador aprovados, incluindo 25 do
UC-06; 1 integração real opt-in ignorada. Capturas desktop/mobile e confirmação
inspecionadas. Execução com Edge e preview separado por E2E_BASE_URL.

## Alterar estado e reabrir marco — UC-07

Contrato verificado em `../backend-pe03/app/mudanças/{routes,service,validacoes}.py`,
`app/marcos/service.py`, `app/historico/{routes,service}.py`, testes de estado/
mudanças e RN-04/RN-07/CA-03/CA-06. A implementação usa uma única rota de escrita:

```text
POST /obras/{obraId}/mudancas
{alvo:{tipo:"marco",id:marcoId}, campo:"estado", novo_valor, motivo, versao}
```

- O detalhe mantém a versão consultada. O formulário aceita `a iniciar`,
  `em andamento` e `concluído`, exige motivo e não envia mudança para o estado
  atual. Reabrir para qualquer estado anterior preserva os eventos já registrados.
- Somente `409` com `codigo: DEPENDENCIAS_PENDENTES`, conclusão solicitada e
  lista válida abre a confirmação com nomes e estados dos pré-requisitos.
  Cancelar/Escape não reenvia. `Concluir mesmo assim` reenvia o mesmo comando,
  com a mesma versão e motivo, acrescentando `confirmar_dependencias:true`.
- Outros `409`, incluindo `DEPENDENCIA_INCONSISTENTE`, bloqueiam novo envio e
  pedem consulta/revisão. Não há confirmação automática, troca para PATCH nem
  duas escritas para uma decisão. `422` marca os campos e permite correção;
  `404`, rede/5xx e respostas inesperadas exigem consulta antes de repetir.
- Duplo clique é bloqueado. Voltar à aba dispara consulta de versão/estado:
  se houve mudança externa, o rascunho fica bloqueado até nova consulta explícita.
  Reconsultar descarta a decisão antiga e o motivo, exigindo revisão consciente.
- Após `200` com dados coerentes, detalhe, lista e histórico são reconsultados.
  O estado exibido vem do GET, sem aplicação otimista do valor enviado. Se uma
  releitura falhar, existe ação de repetir somente as consultas, sem reenviar POST.
- `GET /obras/{obraId}/mudancas` usa o envelope `{mudancas:[...]}`. O cliente
  compartilhado de histórico preserva eventos e valida seu contexto. O detalhe
  mostra as decisões de estado deste marco com antes/depois, motivo, autor e data,
  inclusive após recarga; não inventa eventos a partir do formulário.
- A navegação e comparação completas do histórico permanecem no cartão UC-13.
  O estado da obra é independente do estado do marco.

O formulário mantém a identidade visual existente e mostra a transição antes do
salvamento. Mensagens por campo seguem a orientação da
[W3C para notificações de formulários](https://www.w3.org/WAI/tutorials/forms/notifications/),
e o aviso usa a ação específica `Concluir mesmo assim`, seguindo as recomendações
de [nomes claros de comandos do NN/G](https://www.nngroup.com/articles/ui-copy/).

`tests/e2e/uc-07.spec.js` cobre os três estados, conclusão/reabertura, motivo,
versão, confirmação/cancelamento, conflitos, atualização em outra aba, duplo
clique, falhas HTTP, respostas incompletas e releitura após escrita. A API dos
cenários é controlada: essa execução não substitui Atlas/reinício ou CT-111 no
ambiente publicado. O backend e suas transações não foram alterados.

Validação local do UC-07 em 02/11/2026: build aprovado, 14 testes unitários/
contratuais e suíte completa com 149 cenários de navegador aprovados, incluindo
21 do UC-07. Um cenário real opt-in ficou ignorado. Foram verificados também
login/restauração de sessão, obras, imagens, navegação/rolagem, cadastro/consulta
de marcos e dependências. Capturas de desktop/mobile e do aviso de pendências
foram inspecionadas. Execução com Edge e preview separado por E2E_BASE_URL.

## Publicação e linha do tempo — UC-10

Conexão conferida com o código em `../backend-pe03`: o cliente usa `/api`
no desenvolvimento e o proxy Vite encaminha para `http://127.0.0.1:5000`
(ou `API_PROXY_TARGET`). Em produção, configurar `VITE_API_BASE_URL` e o
encaminhamento HTTP apropriado. A configuração não comprova disponibilidade.

Revisão consulta avanço e valida seu marco na obra. Confirmação envia somente
`{}` e aceita 201/200; autoria, conteúdo e instante vêm do servidor. Consultas
posteriores de detalhe, publicações, avanços e prévia são independentes da
confirmação. Falha de releitura permite repetir apenas GET. Resposta perdida
exige consultar o estado antes de oferecer outra decisão. A linha do tempo
preserva a ordem da API e apresenta cada avanço publicado uma vez.

Mídias são recuperadas com Bearer em Blob, com liberação das URLs temporárias;
imagens, vídeos e download de documentos preservam o cartão em caso de falha.
O cadastro de evidências depende de UC-08. Correção e versões foram integradas
em UC-11, descrita abaixo; os links usam as rotas React existentes. A prévia continua exclusiva da construtora.

`tests/e2e/uc-10.spec.js` usa API controlada. Persistência após reinício e
recuperação dos três tipos de mídia no EC2/Cloudinary exigem ambiente integrado.

Validação local de UC-10 em 02/11/2026: build aprovado, 15 testes unitários/
contratuais e 10 cenários de navegador aprovados no Edge. Cobertura inclui
cancelamento, duplo clique, resposta perdida, erros 404/422/409/503, falha de
releitura após confirmação, datas distintas, ordem e arquivo indisponível.
A porta local 5000 não respondeu na verificação; não foi possível comprovar
conexão ativa, persistência real ou recuperação via Cloudinary nesta execução.

## Corrigir publicação e comparar versões — UC-11

Contratos conferidos em `../backend-pe03/app/avancos/{correcoes,versoes,validacoes}.py`,
`routes.py`, `app/historico/service.py` e nos testes CT-46 a CT-51.

- O editor consulta avanço, marco da obra, publicação e cadeia de versões antes
  de permitir correção. Descrição, data, mídias mantidas e novos arquivos são
  editáveis; motivo e alteração efetiva são obrigatórios. Pelo menos uma mídia
  deve permanecer. Alterar a data é opcional.
- `PATCH /avancos/{id}` envia apenas diferenças e motivo. Sem arquivo novo usa
  JSON; com arquivos usa multipart, `midias` repetido e `midias_manter` como JSON
  textual quando alterado. Autor, instante e cadeia anterior não são enviados.
  O frontend não remove arquivos históricos.
- `200` confirma a operação; detalhe, publicação, versões, prévia e histórico
  são reconsultados. Falha posterior mantém a confirmação e permite repetir
  somente GET. A resposta não substitui a publicação por um estado otimista.
- Duplo clique é bloqueado. Erros 422 preservam o formulário para correção;
  conflito, falha de rede, timeout ou resposta inesperada exigem consultar o
  estado real antes de outra decisão. A consulta descarta o formulário antigo.
- `ComparacaoVersoes` apresenta a cadeia retornada, sem reconstruir auditoria:
  versão inicial, atual, conteúdo anterior/novo, campos, motivo, autoria e instante.
  Diferenças igual/inserido/removido/substituído são texto React seguro.
- Origem simulada, autor original, publicador e autor da correção são separados;
  a prévia mantém indicação de edição mesmo na restauração do texto original.
- Mídia histórica não retida ou com conteúdo nulo apresenta metadados sem
  download/requisição. Retenção não garante disponibilidade remota: falha de
  recuperação mantém a versão e oferece nova tentativa. HISTORICO_INDISPONIVEL
  é apresentado como falha de integridade, nunca como lista vazia.

Testes de navegador: `tests/e2e/uc-11.spec.js` usa API controlada e cobre duas
correções/recarga, HTML seguro, motivos/alterações obrigatórios, cancelamento,
retenção, erros, resposta perdida, falha de releitura, upload multipart,
diferenças e mudança somente de data. Capturas desktop/mobile ficam em
`test-results/` e foram inspecionadas. Recuperação real Cloudinary/EC2 e
persistência após reinício do MongoDB continuam exigindo ambiente integrado.

Backend: 60 testes de correção/versões aprovados com provedores simulados;
3 cenários Atlas ignorados por serem opt-in. Nenhum contrato do backend foi
alterado. O cadastro/edição de rascunhos continua nos UCs 08/09.

Validação final local em 02/11/2026: build e 15 testes unitários/contratuais
aprovados; 21 cenários UC-10/11 validados no Edge. Na execução conjunta, um
cenário encontrou ERR_NETWORK_CHANGED do navegador e passou na repetição
isolada; os outros 20 passaram. A suíte UC-11 isolada também passou com seus
11 cenários. Não foram executadas integrações reais Atlas/Cloudinary/EC2.

## Replanejar, concluir e reabrir obra/marco — UC-12

Contrato consultado em `../backend-pe03/app/mudanças/{service,validacoes}.py`,
`app/dominio/obras.py`, serviços de obra/marco, histórico e testes CT-52–59/
CT-27–28; regras RN-01/RN-02/RN-07 e CA-06.

- `/obras/{id}/historico/nova-mudanca` consulta alvo e versão antes da decisão.
  Permite entrega/estado da obra e período previsto/estado do marco, com valor
  atual em leitura e motivo obrigatório. O detalhe do marco oferece Replanejar
  período do marco; a edição descritiva continua separada do replanejamento.
- Única escrita: `POST /obras/{id}/mudancas` com alvo, campo, novo_valor,
  motivo e versão. Não envia antes, autor, instante ou conclusão. A modalidade
  de entrega é enviada completa e sem campos da modalidade anterior. Datas
  reais, ordem e limites iguais são verificados; alerta e conclusão vêm da API.
- O aviso de dependências foi extraído de UC-07 em `ConfirmacaoDependencias`.
  Só DEPENDENCIAS_PENDENTES coerente para conclusão de marco abre confirmação;
  confirmar reenvia o mesmo comando com `confirmar_dependencias:true`.
  Cancelar/Escape não reenvia. Nenhuma escrita usa os PATCH legados.
- Após 200, reconsulta alvo, resumo da obra, listas de obras/marcos e histórico.
  O contexto do layout recebe somente a obra consultada por GET, atualizando
  o cabeçalho sem desmontar o formulário. Leitura parcial permite nova consulta
  sem repetir POST; eventos visuais vêm exclusivamente do histórico retornado.
- Repetição com valor igual é permitida com motivo, deixando explícito que não
  cria evento. Concluir/reabrir conserva o antes/depois retornado, inclusive
  a conclusão anterior; o dia UTC é gerado no servidor.
- Conflitos 409 releem o alvo e bloqueiam o formulário, preservando intenção e
  motivo separados do valor atual. Revisar intenção com versão atual consulta
  novamente e libera revisão manual, sem reenviar. Retorno à aba revalida a
  versão. Rede/timeout/400/404/500 também exigem consulta; 422 permite corrigir
  campos. Trocar alvo/campo cancela consultas anteriores e descarta a decisão.
- O leitor mínimo mostra antes/depois, campos, motivo, autoria e instante do
  alvo escolhido. Navegação completa do histórico permanece no UC-13.

`tests/e2e/uc-12.spec.js` usa API controlada para modalidades, período, conclusão/
reabertura, repetição, dependências, duas abas, versão obsoleta, validação,
cancelamento, erros, resposta perdida e releitura após 200. Capturas desktop/
mobile ficam em `test-results/`. `tests/mudanca.test.js` verifica datas,
estados permitidos, normalização e comparação independente da ordem JSON.

Backend: 81 testes de mudanças/estado de obra/marco aprovados com banco simulado;
13 cenários Atlas opt-in ignorados. Persistência/transações em Atlas e CT-111
no ambiente publicado continuam exigindo execução integrada própria.

Validação local de UC-12 em 02/11/2026: build aprovado e 17 testes unitários/
contratuais aprovados. Foram validados 16 cenários de UC-12 no Edge, incluindo
resposta atrasada do histórico; também passaram 21 cenários de UC-07 e 24 de
UC-04, incluindo acesso ao novo formulário. Capturas desktop/mobile foram
inspecionadas, sem rolagem horizontal a 390 px. Os testes usam APIs controladas
e não comprovam persistência real no Atlas ou disponibilidade do EC2.

## Ajustes da revisão de UC-10/11/12

- UC-10: após a releitura, o cartão usa a publicação retornada pelo GET, inclusive
  se outra aba corrigiu o conteúdo. A confirmação continua separada da falha de
  leitura; repetir a visualização não publica novamente.
- UC-11: detalhe, versão atual e publicação precisam concordar em descrição,
  data e composição de mídias antes de liberar o editor. Retenção e caminhos
  de acesso não representam alterações de conteúdo. Antes do PATCH, reconsulta
  o conjunto e compara conteúdo e número da versão revisada; divergência bloqueia
  o envio e exige Recarregar e revisar. Também detecta correções que restauraram
  o texto original. A consulta prévia não é uma precondição atômica: o contrato
  atual do PATCH não recebe a versão do cliente; o controle transacional durante
  a escrita permanece no backend. Não foi acrescentado um campo não suportado.
- UC-12: a versão revisada fica separada da versão exibida. Atualizar consultas
  não altera a base da intenção; uma versão diferente exige revisão explícita.
  Após um POST confirmado, usa sua versão como base e detecta novas mudanças
  concorrentes encontradas nas consultas seguintes.

Validação dos ajustes: build aprovado, 19 testes unitários/contratuais e 43
cenários de navegador UC-10/11/12 aprovados no Edge, com API controlada. Foram
adicionados seis cenários de regressão e dois testes de consistência. Não foram
executadas integrações reais com Atlas/Cloudinary/EC2 nesta revisão.

## Revisão de UC-01/02/03 em 02/11/2026

Conferidos os contratos de sessão, cadastro e filtros em `../backend-pe03`.
Foi reproduzido um bloqueio de UC-01: o Flask-JWT-Extended responde 422 para
JWT inválido, e o frontend preservava esse token como se a falha fosse
temporária, impedindo novo login. `AuthProvider` agora descarta o token rejeitado
na restauração, orienta entrar novamente e preserva o destino protegido. Rede,
timeout e 5xx continuam permitindo nova tentativa sem apagar o token.

O teste de UC-02 que bloqueia cliques duplicados agora aguarda a chegada do POST
e a preparação da resposta controlada antes de conferir a contagem e liberá-la.
A revisão de UC-03 não encontrou necessidade de alteração funcional em filtros,
contexto da obra, alerta de atraso ou descarte de respostas antigas.

Validação: build e 19 testes unitários/contratuais aprovados; 58 cenários de
navegador UC-01/02/03 aprovados no Edge com API controlada. O novo teste de JWT
inválido falhou antes do ajuste e passou após a correção. Um cenário de login
real permaneceu opt-in, sem execução; Atlas/Cloudinary/EC2 não foram validados
nesta revisão.

## Registro de ocorrências — UC-14

A aba Ocorrências lista e consulta os registros da obra. O cadastro aceita
marco, responsável vinculado e até cinco evidências opcionais; sem arquivos usa
JSON e, com arquivos, multipart. A data e a autoria vêm do servidor. Uma falha
de conexão, timeout ou 5xx deixa o resultado incerto e orienta consultar a
lista antes de um novo envio. A tela não cria aceitação automaticamente.

`tests/e2e/uc-14.spec.js` usa API controlada para verificar cadastro, consulta,
vínculos, erros e resposta perdida. Os testes de backend usam banco em memória
e provedor simulado por padrão; persistência após reinício no Atlas e mídia real
exigem os testes opt-in e ambiente exclusivo descritos no backend. As telas de
cadastro de trabalhador e aceitação permanecem em preparação nesta branch.
