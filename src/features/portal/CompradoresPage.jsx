import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, UsersRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import ConfirmDialog from '../../shared/ui/ConfirmDialog';
import './compradores.css';

export default function CompradoresPage() {
  const { request } = useAuth();
  const [obras, setObras] = useState([]);
  const [lista, setLista] = useState([]);
  const [buscaCompradores, setBuscaCompradores] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState(null);
  const [alterandoStatus, setAlterandoStatus] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusErro, setStatusErro] = useState('');
  const [statusBloqueado, setStatusBloqueado] = useState(false);
  const [statusMensagem, setStatusMensagem] = useState('');

  const carregar = useCallback(async () => {
    const [obrasResult, compradoresResult] = await Promise.all([request('/obras'), request('/compradores')]);
    setObras(obrasResult.obras);
    setLista(compradoresResult.compradores);
  }, [request]);

  useEffect(() => {
    let ativo = true;
    carregar().catch((failure) => { if (ativo) setErro(failure.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [carregar]);

  async function salvar(event) {
    event.preventDefault();
    setBusy(true); setMensagem(''); setErro('');
    try {
      await request('/compradores', { method: 'POST', body: { nome, email, senha, obras: selecionadas } });
      setNome(''); setEmail(''); setSenha(''); setSenhaVisivel(false); setSelecionadas([]);
      setMensagem('Comprador cadastrado.');
      try { await carregar(); } catch { setErro('Cadastro concluído, mas não foi possível atualizar a lista. Recarregue a página.'); }
    } catch (failure) { setErro(failure.message); }
    finally { setBusy(false); }
  }

  async function confirmarStatus() {
    if (statusBusy || statusBloqueado) return;
    setStatusBusy(true); setStatusErro('');
    const alvo = alterandoStatus;
    try {
      const resultado = await request(`/compradores/${encodeURIComponent(alvo.id)}/status`, {
        method: 'PATCH', body: { ativo: !alvo.ativo, versao: alvo.versao ?? 0 },
      });
      if (resultado?.id !== alvo.id || resultado.ativo !== !alvo.ativo || resultado.versao !== (alvo.versao ?? 0) + 1) throw new Error('Resposta incompleta');
      setLista(itens => itens.map(item => item.id === resultado.id ? resultado : item));
      setAlterandoStatus(null);
      setStatusMensagem(`Conta de ${resultado.nome} ${resultado.ativo ? 'reativada' : 'desativada'}.`);
    } catch (failure) {
      if (!failure.status || failure.status === 0 || failure.status === 409 || failure.status >= 500) {
        setStatusBloqueado(true);
        setStatusErro('Não foi possível confirmar o status ou o cadastro mudou. Feche esta janela e atualize a lista antes de tentar novamente.');
      } else setStatusErro(failure.message);
    } finally { setStatusBusy(false); }
  }
  async function atualizarStatus() {
    setStatusBusy(true); setStatusMensagem('');
    try { await carregar(); setStatusBloqueado(false); setStatusMensagem('Lista atualizada. Confira o status antes de tentar novamente.'); }
    catch (failure) { setStatusMensagem(`Não foi possível atualizar a lista: ${failure.message}`); }
    finally { setStatusBusy(false); }
  }
  const normalizarBusca = valor => (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const termoComprador = normalizarBusca(buscaCompradores.trim());
  const compradoresFiltrados = lista.filter(comprador =>
    (normalizarBusca(comprador.nome).includes(termoComprador) || normalizarBusca(comprador.email).includes(termoComprador)) &&
    (filtroStatus === 'todos' || comprador.ativo === (filtroStatus === 'ativos'))
  );
  return <div className="compradores-page">
    <header className="compradores-heading"><h1>Compradores</h1><p>Cadastre usuários e defina quais obras eles podem acompanhar.</p></header>
    <div className="compradores-grid">
      <section className="feature-card compradores-card" aria-labelledby="novo-comprador-titulo">
        <h2 id="novo-comprador-titulo">Novo comprador</h2>
        <form onSubmit={salvar}>
          <label className="compradores-field" htmlFor="comprador-nome"><span>Nome</span><input id="comprador-nome" required maxLength={120} placeholder="Nome completo" autoComplete="name" value={nome} onChange={(event) => setNome(event.target.value)} /></label>
          <label className="compradores-field" htmlFor="comprador-email"><span>E-mail</span><input id="comprador-email" required type="email" maxLength={254} placeholder="nome@exemplo.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <div className="compradores-field"><label htmlFor="comprador-senha">Senha inicial</label><div className="compradores-password"><input id="comprador-senha" required minLength={8} type={senhaVisivel ? 'text' : 'password'} placeholder="Crie uma senha" autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} /><button type="button" aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={senhaVisivel} onClick={() => setSenhaVisivel((value) => !value)}>{senhaVisivel ? <EyeOff size={21} /> : <Eye size={21} />}</button></div></div>
          <SeletorObras obras={obras} selecionadas={selecionadas} setSelecionadas={setSelecionadas} carregando={carregando} id="cadastro" />
          <button className="button button-primary compradores-submit" type="submit" disabled={busy || carregando || !selecionadas.length}>{busy ? 'Cadastrando…' : 'Cadastrar comprador'}</button>
          {mensagem && <p className="compradores-feedback" role="status">{mensagem}</p>}{erro && <p className="compradores-feedback form-error" role="alert">{erro}</p>}
        </form>
      </section>
      <section className="feature-card compradores-card compradores-lista" aria-labelledby="compradores-cadastrados-titulo">
        <h2 id="compradores-cadastrados-titulo">Compradores cadastrados</h2>{statusMensagem && <p role="status">{statusMensagem}</p>}{statusBloqueado && <button type="button" className="button button-secondary" disabled={statusBusy} onClick={atualizarStatus}>Atualizar lista</button>}
        <div className="compradores-filtros"><label className="compradores-field" htmlFor="busca-compradores"><span>Buscar comprador</span><input id="busca-compradores" type="search" placeholder="Nome ou e-mail" value={buscaCompradores} onChange={event => setBuscaCompradores(event.target.value)} /></label><label className="compradores-field" htmlFor="status-compradores"><span>Status</span><select id="status-compradores" value={filtroStatus} onChange={event => setFiltroStatus(event.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="desativados">Desativados</option></select></label></div>
        {!carregando && !erro && lista.length > 0 && <p className="compradores-resultado" role="status">{compradoresFiltrados.length} {compradoresFiltrados.length === 1 ? "comprador encontrado" : "compradores encontrados"}</p>}
        {carregando ? <p role="status">Carregando compradores…</p> : compradoresFiltrados.length ? <div className="compradores-registros">{compradoresFiltrados.map((comprador) => <article className="compradores-registro" key={comprador.id}><h3>{comprador.nome}</h3><p><span className={comprador.ativo ? "comprador-status ativo" : "comprador-status inativo"}>{comprador.ativo ? "Ativo" : "Desativado"}</span></p><p>{comprador.email}</p><p>Obras: {comprador.obras.length ? comprador.obras.map((id) => obras.find((obra) => obra.id === id)?.nome || 'Obra indisponível').join(', ') : 'Nenhuma obra vinculada'}</p><button type="button" className="button button-secondary comprador-editar" onClick={() => setEditando(comprador)}>Editar comprador</button>{' '}<button type="button" className="button button-secondary comprador-editar" disabled={statusBloqueado || statusBusy} onClick={() => { setStatusErro(''); setStatusMensagem(''); setAlterandoStatus(comprador); }}>{comprador.ativo ? 'Desativar acesso' : 'Reativar acesso'}</button></article>)}</div> : lista.length && !erro ? <p className="compradores-sem-resultados">Nenhum comprador encontrado para os filtros selecionados.</p> : !erro && <div className="compradores-empty"><UsersRound size={52} strokeWidth={1.4} aria-hidden="true" /><p>Nenhum comprador cadastrado</p><span>Os compradores aparecerão aqui após o cadastro.</span></div>}
      </section>
    </div>
    {alterandoStatus && <ConfirmDialog title={`${alterandoStatus.ativo ? "Desativar" : "Reativar"} acesso de ${alterandoStatus.nome}?`} confirmLabel={alterandoStatus.ativo ? "Desativar acesso" : "Reativar acesso"} confirmVariant={alterandoStatus.ativo ? "danger" : "primary"} busy={statusBusy} error={statusErro} onCancel={() => { setAlterandoStatus(null); setStatusErro(""); }} onConfirm={confirmarStatus}><p>{alterandoStatus.ativo ? "O comprador perderá acesso às obras e suas sessões atuais serão encerradas. O cadastro e os vínculos serão preservados." : "O comprador poderá entrar novamente e consultar as obras vinculadas."}</p></ConfirmDialog>}
    {editando && <EditarComprador key={editando.id} comprador={editando} obras={obras} request={request} onCancelar={() => setEditando(null)} onSalvo={(atualizado) => { setLista((itens) => itens.map((item) => item.id === atualizado.id ? atualizado : item)); setEditando(null); }} />}
  </div>;
}


function EditarComprador({ comprador, obras, request, onCancelar, onSalvo }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [nome, setNome] = useState(comprador.nome);
  const [email, setEmail] = useState(comprador.email);
  const [selecionadas, setSelecionadas] = useState(comprador.obras);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  async function salvar(event) {
    event.preventDefault();
    if (busy || bloqueado) return;
    setBusy(true); setErro('');
    try {
      const atualizado = await request(`/compradores/${encodeURIComponent(comprador.id)}`, {
        method: 'PATCH', body: { nome, email, obras: selecionadas, versao: comprador.versao ?? 0 },
      });
      if (atualizado?.id !== comprador.id || !Array.isArray(atualizado.obras)) throw new Error('Não foi possível confirmar o cadastro atualizado. Recarregue a página.');
      onSalvo(atualizado);
    } catch (failure) {
      if (failure.status === 409 || failure.status === 0 || failure.status >= 500 || !failure.status) {
        setBloqueado(true);
        setErro('Não foi possível confirmar a alteração ou os dados mudaram. Recarregue a página e revise o cadastro antes de tentar novamente.');
      } else setErro(failure.message);
    } finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="feature-card comprador-edit-dialog" aria-labelledby="editar-comprador-titulo" onCancel={event => { event.preventDefault(); if (!busy) onCancelar(); }}>
    <h2 id="editar-comprador-titulo">Editar comprador</h2><p>Atualize os dados e as obras que este comprador pode acompanhar.</p>
    <form onSubmit={salvar}>
      <label className="compradores-field" htmlFor="editar-comprador-nome"><span>Nome</span><input id="editar-comprador-nome" required maxLength={120} value={nome} onChange={e => setNome(e.target.value)} /></label>
      <label className="compradores-field" htmlFor="editar-comprador-email"><span>E-mail</span><input id="editar-comprador-email" required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <SeletorObras obras={obras} selecionadas={selecionadas} setSelecionadas={setSelecionadas} id="edicao" />
      {erro && <p role="alert" className="form-error">{erro}</p>}
      <div className="comprador-edit-actions"><button type="submit" className="button button-primary" disabled={busy || bloqueado || selecionadas.some(id => !obras.some(obra => obra.id === id))}>{busy ? 'Salvando…' : 'Salvar alterações'}</button><button type="button" className="button button-secondary" disabled={busy} onClick={onCancelar}>Cancelar</button></div>
    </form>
  </dialog>;
}




function SeletorObras({ obras, selecionadas, setSelecionadas, carregando = false, id }) {
  const [busca, setBusca] = useState('');
  const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const termo = normalizar(busca.trim());
  const visiveis = obras.filter(obra => normalizar(obra.nome || '').includes(termo));
  const indisponiveis = selecionadas.filter(obraId => !obras.some(obra => obra.id === obraId));
  return <fieldset className="compradores-obras"><legend>Obras vinculadas</legend>
    <p>Selecione as obras que este comprador poderá acompanhar.</p>
    <label className="compradores-field compradores-busca" htmlFor={`busca-obras-${id}`}><span>Buscar obra</span><input id={`busca-obras-${id}`} type="search" placeholder="Buscar pelo nome da obra" value={busca} onChange={e => setBusca(e.target.value)} disabled={carregando} /></label>
    <p className="compradores-contagem" aria-live="polite">{selecionadas.length} {selecionadas.length === 1 ? 'obra selecionada' : 'obras selecionadas'}</p>
    <div className="compradores-obras-lista">
      {carregando ? <p className="compradores-obras-vazio" role="status">Carregando obras…</p> : !obras.length ? <p className="compradores-obras-vazio">Nenhuma obra disponível.</p> : !visiveis.length ? <p className="compradores-obras-vazio">Nenhuma obra encontrada para esta busca.</p> : visiveis.map(obra => <label className="compradores-obra" key={obra.id}><input type="checkbox" checked={selecionadas.includes(obra.id)} onChange={e => setSelecionadas(itens => e.target.checked ? [...itens, obra.id] : itens.filter(item => item !== obra.id))} /><span>{obra.nome}</span></label>)}
      {indisponiveis.map(obraId => <label className="compradores-obra" key={obraId}><input type="checkbox" checked onChange={() => setSelecionadas(itens => itens.filter(item => item !== obraId))} /><span>Obra indisponível — remova este vínculo para salvar</span></label>)}
    </div>
  </fieldset>;
}


