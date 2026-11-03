# Contexto persistente do projeto

## Associação confirmada pelo usuário

Em 01/11/2026, o usuário confirmou que `frontend-pe03` é a continuação de
`programacao-eficaz-projeto3`, responsável pelo frontend do mesmo produto.
Tratar os dois repositórios como partes do mesmo sistema de acompanhamento de
obras residenciais, preservando as decisões, regras e contratos do projeto original.

O backend e sua documentação estão em `../programacao-eficaz-projeto3`.
Caminho local confirmado nesta máquina:
`C:/Users/Victor_ms/Documents/GitHub/programacao-eficaz-projeto3`.
Preferir o caminho relativo entre os repositórios para não depender desta máquina.

## Como recuperar o contexto

Antes de implementar uma funcionalidade, consultar no projeto original os
documentos e o código relevantes. Este arquivo é um índice persistente, não uma
cópia de todos os dados nem uma importação automática dos chats anteriores.
Reconsultar as fontes quando necessário para acompanhar alterações do backend.
Se o repositório original não estiver acessível, informar a limitação em vez de
inventar contratos ou decisões.

Referências relativas à raiz do backend:

- `README.md`: inventário de rotas implementadas, contratos HTTP e instruções de execução.
- `docs/01-visao-e-escopo.md`: produto, limites do MVP e prazo registrado de 03/11/2026.
- `docs/02-dominio-e-regras.md` e `docs/03-funcionalidades.md`: domínio e funcionalidades.
- `docs/04-jornadas-e-aceite.md`: jornadas e critérios de aceite.
- `docs/05-arquitetura-e-contratos.md`: arquitetura e contratos propostos; nem todos os caminhos propostos são implementados.
- `docs/06-apis-externas.md` e `docs/07-plano-e-decisoes.md`: integrações, decisões e pendências.
- `docs/08-casos-de-uso-mvp.md`, `docs/09-casos-de-teste-mvp.md` e `docs/10-matriz-de-rastreabilidade.md`: casos de uso, testes e rastreabilidade.
- `docs/11-organizacao-backend.md`, `docs/12-cartoes-trello-finalizacao.md` e `docs/13-modelo-poo.md`: organização, finalização e decisões de implementação.
- `app/`, `construtora.py`, `trabalhadores.py` e `tests/`: comportamento implementado e exemplos verificáveis dos contratos.
- `tests/README.md`: execução e limites dos testes de integração.

Para integrar uma tela, conferir rotas, payloads, respostas, autenticação e erros
no código e nos testes correspondentes. Não assumir que uma proposta antiga da
documentação já está implementada. Explicitar divergências relevantes.

## Contexto inicial verificado em 01/11/2026

- Frontend previsto em React, consumindo Flask por HTTP em repositório separado.
  A base React + Vite foi iniciada em 01/11/2026. Rotas ficam em
  `src/app/router.jsx` e `src/features/*/routes.jsx`; consultar o README para a arquitetura.
- Backend com MongoDB Atlas, autenticação JWT e integração Cloudinary para mídias.
- Jornada central: criar obra, definir marcos, registrar avanço com evidências,
  publicar atualização e acompanhar mudanças e ocorrências com histórico persistente.
- Apenas a conta da construtora é funcional no MVP. Trabalhadores são cadastros
  sem login; comprador e engenheiro não possuem fluxo funcional.
- Obra aceita data exata ou intervalo estimado. Marcos pertencem diretamente à
  obra, sem entidade intermediária de etapa. Dependências pendentes geram aviso
  e confirmação para concluir um marco.
- Distinguir rascunho, publicação e correção versionada. Preservar motivos,
  autoria, datas e histórico retornados pelo backend.
- `atrasada` é um alerta separado do estado da obra. Conclusão efetiva e autoria
  são registradas pelo servidor.
- Exclusões precisam apresentar impacto e confirmação conforme o contrato da
  operação. Para obra, marco, avanço e ocorrência, somente 204 confirma a exclusão;
  a exclusão de trabalhador usa 200 com mensagem, ID e contagem de ocorrências
  sem responsável. Tratar limpeza pendente como pendência.
- Credenciais de MongoDB, JWT e Cloudinary pertencem ao servidor; não copiá-las
  para o frontend nem para arquivos de contexto.

Manter esta associação nas próximas tarefas deste repositório e atualizar este
contexto quando o usuário confirmar mudanças de escopo ou localização.

## Confirmações na elaboração dos cartões de frontend em 01/11/2026

- Cloudinary foi aprovada pelo professor como API externa. A confirmação não
  substitui validação técnica real de upload/recuperação nem do uso gratuito.
- Retirar um trabalhador de uma obra deve limpar sua atribuição nas ocorrências
  dessa obra, preservando o responsável anterior e o histórico. No backend local
  consultado (commit `3e965c5`), `app/trabalhadores/repository.py::atualizar` e os
  testes ainda mantêm a atribuição; há dependência de correção do backend.
- Excluir o cadastro do trabalhador deve preservar ocorrências, limpar
  `responsavel_id` e guardar `responsavel_anterior`; essa política foi confirmada
  e já está implementada. Revisar também o controle de concorrência das ocorrências:
  a limpeza consultada não incrementa sua versão, apesar de a matriz dizer isso.
- `docs/cartoes-trello-frontend.md` contém os 20 cartões, contratos consultados,
  propostas de interface, dependências e a divergência acima. É planejamento,
  não evidência de implementação ou execução dos testes do frontend.

## Localização verificada nesta máquina em 02/11/2026

O backend está acessível em `../backend-pe03`. Para esta instalação, consultar
esse repositório para contratos e testes do produto. UC-10 foi conferido em
`app/publicacoes/`, `app/avancos/previa.py`, `app/avancos/service.py` e nos testes
de publicações/prévia. O proxy de desenvolvimento aponta por padrão para
`http://127.0.0.1:5000`; a presença do código não comprova servidor ativo.

## UC-20 — revisão posterior

A correção de desvinculação e exclusão está no commit `5edd370` da branch
`MatheusHermida` de `../backend-pe03`: a limpeza é transacional e incrementa
a versão da ocorrência. O frontend verifica as ocorrências após a releitura.
Cenários de concorrência e persistência foram executados no Atlas com coleções
temporárias em 02/11/2026; a integração depende dessa versão implantada.
