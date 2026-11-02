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
  rede/5xx permitem tentar novamente, sem anunciar saída. Após saída/401, dados
  protegidos são desmontados; retorno pelo histórico continua exigindo sessão.
  Páginas recuperadas do cache de histórico revalidam a sessão antes de exibir dados.
- Demais páginas são estruturas identificadas como **Em preparação**.
  Formulários, detalhes e escritas de negócio ainda precisam ser implementados.
  O cabeçalho da obra mostra seu ID até existir a consulta do detalhe.
- Base visual e `UI.jsx` reaproveitados da referência local
  `C:/Users/Victor_ms/Downloads/projeto-agil-vscode/projeto-agil`.

## Continuar o desenvolvimento

Consultar README, código e testes do backend antes de implementar cada fluxo.
Somente a construtora autentica. Evidências pertencem a avanços ou ocorrências;
dependências são entre marcos. Preservar rascunhos, publicações, versões,
motivos e confirmações conforme os contratos reais. Tratar conflitos e limpeza
pendente sem indicar sucesso falso.

Próxima entrega: criar obra, consultar detalhe, cadastrar marco e registrar
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
usa a página estrutural de marcos. Traces e screenshots ficam desabilitados
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
