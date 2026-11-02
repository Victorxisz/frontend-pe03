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

Próximas entregas: editar dados descritivos em UC-04, cadastrar marco e registrar
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
