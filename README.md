# Projeto Ágil — frontend

Frontend React + Vite de `../programacao-eficaz-projeto3` (Flask).

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
rotas React e proxy de `/api/*` ao Flask, removendo `/api`. O proxy do Vite é
exclusivo do desenvolvimento. `npm run preview` também precisa de proxy externo
ou de `VITE_API_BASE_URL` absoluto configurado antes do build.
Variáveis `VITE_*` são públicas. Credenciais de banco, Cloudinary e chave JWT
ficam exclusivamente no backend.

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
- Token de acesso em memória e `sessionStorage`; 401 autenticado encerra a
  sessão local. Renovação automática com refresh token é pendente: atualmente
  acesso expirado exige novo login. Nenhuma senha é persistida.
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
