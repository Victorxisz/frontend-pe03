import { ApiError } from '../../shared/api/http.js';
import { diaValido } from '../../shared/lib/datas.js';

export function conferirAvancoEdicao(value, id) {
  if (!value || value.id !== id || typeof value.marco_id !== 'string' || !value.marco_id
    || typeof value.estado !== 'string' || typeof value.data !== 'string' || typeof value.descricao !== 'string'
    || !Array.isArray(value.midias) || !value.midias.every(m => m && typeof m.id === 'string' && m.id
      && (!m.avanco_id || m.avanco_id === id))
    || new Set(value.midias.map(m => m.id)).size !== value.midias.length) {
    throw new Error('Não foi possível interpretar o avanço e suas mídias. Consulte novamente.');
  }
  return value;
}

// Links de leitura e a ordem retornada não alteram o conjunto de evidências.
function snapshot(item) {
  return JSON.stringify([item.estado, item.marco_id, item.autor, item.data, item.descricao, item.revisao,
    item.midias.map(m => [m.id, m.nome, m.tipo, m.mime, m.tamanho]).sort((a, b) => a[0].localeCompare(b[0]))]);
}
export function mesmoRascunho(a, b) { return snapshot(a) === snapshot(b); }

export function prepararEdicaoRascunho(base, draft, kept, files) {
  const errors = {};
  if (!diaValido(draft.data)) errors.data = 'Informe uma data válida.';
  if (!draft.descricao.trim()) errors.descricao = 'Informe a descrição do trabalho.';
  const ids = base.midias.map(m => m.id);
  if (new Set(kept).size !== kept.length || kept.some(id => !ids.includes(id))) errors.midias = 'Selecione somente evidências deste avanço.';
  if (!kept.length && !files.length) errors.midias = 'Mantenha ao menos uma evidência ou adicione um novo arquivo.';
  if (files.length > 5) errors.midias = 'Adicione no máximo cinco novos arquivos por envio.';
  const changes = {};
  if (draft.data !== base.data) changes.data = draft.data;
  if (draft.descricao.trim() !== base.descricao) changes.descricao = draft.descricao.trim();
  if (kept.length !== ids.length || kept.some(id => !ids.includes(id))) changes.midias_manter = [...kept];
  return { changes, errors, dirty: files.length > 0 || Object.keys(changes).length > 0 };
}

export function corpoEdicaoRascunho(changes, files) {
  if (Object.keys(changes).some(key => !['data', 'descricao', 'midias_manter'].includes(key))) {
    throw new Error('A edição só pode alterar data, descrição e evidências.');
  }
  if (!files.length) return changes;
  const form = new FormData();
  for (const [key, value] of Object.entries(changes)) form.append(key, key === 'midias_manter' ? JSON.stringify(value) : value);
  files.forEach(file => form.append('midias', file));
  return form;
}

export function conferirEdicaoConfirmada(value, id, changes) {
  if (value?.id !== id || value.estado !== 'rascunho' || !diaValido(value.data)
    || typeof value.descricao !== 'string' || !value.descricao.trim()
    || !Number.isSafeInteger(value.revisao) || value.revisao < 1
    || (changes.data !== undefined && value.data !== changes.data)
    || (changes.descricao !== undefined && value.descricao !== changes.descricao)) {
    throw new ApiError('A resposta não confirmou a edição do rascunho. Consulte o estado atual antes de reenviar.', 0);
  }
  return value;
}
