import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { matchRoutes } from 'react-router-dom';

test('rotas de negócio são protegidas e caminhos estáticos não viram IDs', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { routes } = await server.ssrLoadModule('/src/app/routes.jsx');
    const cases = [
      ['/obras/nova', 'obras/nova'],
      ['/obras/123/editar', 'obras/:obraId/editar'],
      ['/obras/123/marcos/novo', 'marcos/novo'],
      ['/obras/123/marcos/456', 'marcos/:marcoId'],
      ['/obras/123/marcos/456/dependencias', 'marcos/:marcoId/dependencias'],
      ['/obras/123/marcos/456/avancos/novo', 'marcos/:marcoId/avancos/novo'],
      ['/obras/123/avancos/789/publicar', 'avancos/:avancoId/publicar'],
      ['/obras/123/avancos/789/corrigir', 'avancos/:avancoId/corrigir'],
      ['/obras/123/avancos/789/versoes', 'avancos/:avancoId/versoes'],
      ['/obras/123/ocorrencias/nova', 'ocorrencias/nova'],
      ['/obras/123/ocorrencias/456/aceitacoes', 'ocorrencias/:ocorrenciaId/aceitacoes'],
      ['/obras/123/trabalhadores/novo', 'trabalhadores/novo'],
      ['/obras/123/historico/nova-mudanca', 'historico/nova-mudanca'],
      ['/obras/123/simulados', 'simulados'],
    ];
    for (const [path, expected] of cases) {
      const matches = matchRoutes(routes, path);
      assert.equal(matches.at(-1).route.path, expected, path);
      assert.ok(matches.some(({ route }) => route.element?.type?.name === 'RequireAuth'), path);
    }
    assert.equal(matchRoutes(routes, '/login').at(-1).route.path, 'login');
    assert.equal(matchRoutes(routes, '/obras/123/desconhecida').at(-1).route.path, '*');
  } finally {
    await server.close();
  }
});
