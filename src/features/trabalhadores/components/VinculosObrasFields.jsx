export default function VinculosObrasFields({ obras, selecionadas, onChange, disabled }) {
  const conhecidas = new Set(obras.map(item => item.id));
  const indisponiveis = selecionadas.filter(id => !conhecidas.has(id));
  const toggle = (id, checked) => onChange(checked ? [...selecionadas, id] : selecionadas.filter(item => item !== id));
  return <fieldset className="trabalhador-vinculos"><legend>Obras vinculadas</legend>
    <p>A seleção substitui a lista inteira de vínculos. Desmarcar uma obra retira o vínculo; nenhuma obra selecionada mantém o cadastro sem vínculos.</p>
    {obras.length === 0 && indisponiveis.length === 0 && <p>Nenhuma obra disponível para vincular.</p>}
    {obras.map(obra => <label key={obra.id}><input type="checkbox" checked={selecionadas.includes(obra.id)} disabled={disabled} onChange={e => toggle(obra.id, e.target.checked)} /> {obra.nome} · {obra.id}</label>)}
    {indisponiveis.map(id => <label key={id}><input type="checkbox" checked disabled={disabled} onChange={e => toggle(id, e.target.checked)} /> Obra não disponível na lista: {id}</label>)}
  </fieldset>;
}
