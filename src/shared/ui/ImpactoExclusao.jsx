export default function ImpactoExclusao({ alvo }) {
  if (alvo.perda) return <>
    <p>Excluir definitivamente {alvo.tipo === 'avanco' ? 'o avanço' : 'a ocorrência'} <strong>{alvo.nome}</strong>?</p>
    <p>Esta ação não pode ser desfeita. O servidor informou a remoção dos seguintes registros:</p>
    <dl className="exclusao-impacto">{Object.entries(alvo.perda).map(([key, count]) => <div key={key}><dt>{({ avancos: 'Avanços', ocorrencias: 'Ocorrências', publicacoes: 'Publicações', versoes: 'Correções / versões', midias: 'Mídias', historico: 'Registros de histórico', aceitacoes: 'Aceitações', exemplos_simulados: 'Avanços com origem legada', feedbacks_simulados: 'Vínculos legados' })[key] || key.replaceAll('_', ' ')}</dt><dd>{count}</dd></div>)}</dl>
    <p className="record-reference">Referência: {alvo.id}</p>
  </>;
  return <><p>Excluir definitivamente {alvo.tipo === 'obra' ? 'a obra' : 'o marco'} <strong>{alvo.nome}</strong>?</p><p className="record-reference">Referência: {alvo.id}</p>
    <p>Esta ação não pode ser desfeita. Todos os registros associados serão perdidos, inclusive:</p>
    <ul>{alvo.tipo === 'obra' && <li>Todos os marcos e suas dependências.</li>}<li>Avanços, rascunhos, publicações e todas as versões.</li><li>Mudanças e histórico, inclusive alterações de estado.</li><li>Ocorrências, seus históricos e aceitações.</li><li>Mídias e evidências associadas.</li>{alvo.tipo === 'marco' && <li>Dependências que referenciam este marco, inclusive nos outros marcos.</li>}</ul>
    <p>{alvo.tipo === 'obra' ? 'Os trabalhadores serão desvinculados desta obra. Seus cadastros e vínculos com outras obras serão preservados.' : 'A obra, os outros marcos e os cadastros dos trabalhadores serão preservados.'}</p>
  </>;
}
