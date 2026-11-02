# Verificação da base visual — 01/11/2026

Escopo: inicialização da arquitetura React + Vite e reaproveitamento da linguagem
visual da referência. As páginas de negócio permanecem explicitamente em preparação.

## Evidências

Pasta: `C:/Users/Victor_ms/.codex/visualizations/2026/11/01/01a19918-b120-7fc1-92d9-5a77b4549a48/`.

- Referência: `09-referencia-desktop.png`, da cópia fornecida em Downloads.
- Implementação: `10-login-final.png`, de `http://127.0.0.1:5173/login`.
- Comparação lado a lado inspecionada: `11-comparacao.png`.
- Estado: login sem sessão, formulário vazio, tema claro, desktop.
- Referência: captura de 1265 × 712 pixels; implementação: 1280 × 720 pixels.
  São capturas do viewport padrão do IAB; houve diferença de área útil/barra de
  rolagem entre as abas. A montagem mantém os pixels originais sem redimensionar.
  O devicePixelRatio não foi medido: a comparação é qualitativa, sem alegação de
  equivalência pixel a pixel ou normalização exata de densidade/CSS.

## Resultado da comparação

Tipografia Fraunces/Inter, cores, marca, cartão, campos e botão mantêm a linguagem
da referência. Foram retirados os controles de Google, criação de conta,
recuperação de senha e demonstração local para seguir o escopo atual do backend.
A altura e o espaçamento do cartão refletem essa redução intencional de conteúdo.
Não foram encontrados problemas visuais P0/P1/P2 no login dentro deste escopo.

## Verificação funcional

- Acesso direto à rota protegida `/obras/teste/marcos` encaminhou ao login.
- Endereço desconhecido exibiu a página 404.
- Console do login sem erros na consulta realizada.
- Testes automatizados verificam seleção de rotas estáticas versus IDs,
  proteção das rotas, headers de autenticação, FormData, 204 e erros da API.

Não foi executado login com credenciais reais nem fluxo integrado no Atlas.
Não foram validadas visualmente páginas autenticadas ou todos os breakpoints.
O resultado abaixo aprova a base visual do login e o escopo de inicialização;
não representa aprovação de todos os fluxos do MVP ou de acessibilidade completa.

final result: passed

## Revisão solicitada em 02/11/2026

A revisão atual substitui a direção visual inicial: marca tipográfica em lugar
da régua, títulos em Inter, menos ícones decorativos, cantos menos arredondados
e login com ação principal clara. Saída passa a ter texto visível. Botões têm
feedback de hover/pressão em 140 ms e indicador apenas durante processamento;
`prefers-reduced-motion` desativa deslocamentos e rotação. Não há animações
automáticas de entrada nem atraso artificial no envio.

Referências consultadas:

- [NN/g — The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/):
  movimento breve e discreto para comunicar resposta e mudança de estado.
- [NN/g — Icon Usability](https://www.nngroup.com/articles/icon-usability/):
  ícones ambíguos precisam de rótulos; decoração não deve atrapalhar tarefas.
- [W3C — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html):
  respeitar preferências que desativam animação não essencial.

Verificação: build, 8 testes HTTP/rotas e 13 cenários de navegador aprovados.
Também conferidos foco por teclado, hover com deslocamento de 1 px e ausência
de movimento/transição com preferência reduzida. Capturas locais em
`test-results/login-desktop.png`, `login-mobile.png`, `painel-desktop.png` e
`painel-mobile.png` (pasta ignorada pelo Git). Painel usa dados fictícios.
O teste de conta real continua dependente do ambiente integrado.
Essas referências orientam as escolhas; não foi medido aumento de retenção
ou atenção neste produto, o que exigiria observação de usuários reais.
