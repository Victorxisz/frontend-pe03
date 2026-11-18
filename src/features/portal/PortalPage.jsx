import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CalendarDays, FileText, LogOut, MapPin, Settings } from 'lucide-react';
import LoginComprador from './LoginComprador';
import ConfiguracoesComprador from './ConfiguracoesComprador';
import { createHttpClient } from '../../shared/api/http';
import { formatDate } from '../../shared/ui/UI';
import './portal.css';

const base = import.meta.env.VITE_API_BASE_URL || '/api';
export default function PortalPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('comprador-token') || '');
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState('');
  const [dados, setDados] = useState(null); const [obra, setObra] = useState(null);
  const [secao, setSecao] = useState('obras');
  const [erro, setErro] = useState(''); const [abrindo, setAbrindo] = useState(false);
  function encerrarSessaoInvalida() { sessionStorage.removeItem('comprador-token'); setToken(''); setDados(null); setObra(null); setErro('Sua sessão foi encerrada. Entre novamente.'); }
  const request = createHttpClient({ baseUrl: base, getToken: () => token, onUnauthorized: encerrarSessaoInvalida });
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    createHttpClient({ baseUrl: base, getToken: () => token, onUnauthorized: encerrarSessaoInvalida })('/portal/obras', { signal: controller.signal })
      .then(setDados).catch(e => { if (!controller.signal.aborted && e.status !== 401) setErro(e.message); });
    return () => controller.abort();
  }, [token]);
  async function entrar(e) {
    e.preventDefault(); setErro('');
    try { const result = await request('/portal/login', { method: 'POST', authenticated: false, body: { email, senha } }); sessionStorage.setItem('comprador-token', result.access_token); setToken(result.access_token); setSenha(''); }
    catch (e) { setErro(e.message); setSenha(''); }
  }
  async function abrir(id) {
    setErro(''); setAbrindo(true);
    try { setObra(await request(`/portal/obras/${encodeURIComponent(id)}`)); }
    catch (e) { if (e.status !== 401) setErro(e.message); } finally { setAbrindo(false); }
  }
  function sair() { sessionStorage.removeItem('comprador-token'); setToken(''); setDados(null); setObra(null); setSecao('obras'); setErro(''); }
  if (!token) return <LoginComprador email={email} setEmail={setEmail} senha={senha} setSenha={setSenha} entrar={entrar} erro={erro} />;
  return <div className="portal-layout"><a className="skip-link" href="#portal-conteudo">Ir para o conteúdo</a>
    <aside className="side-nav portal-nav" aria-label="Menu lateral"><div className="side-nav-brand"><Building2 aria-hidden="true" /><span>Acompanhamento de obras</span></div><nav aria-label="Navegação principal"><button className={secao === "obras" ? "portal-nav-active" : undefined} type="button" onClick={() => { setObra(null); setSecao('obras'); setErro(''); }}><Building2 aria-hidden="true" /><span>Minhas obras</span></button><button className={secao === "configuracoes" ? "portal-nav-active" : undefined} type="button" onClick={() => { setSecao('configuracoes'); setErro(''); }}><Settings aria-hidden="true" /><span>Configurações</span></button></nav><div className="side-nav-account"><span className="side-nav-user" title={dados?.nome}>{dados?.nome || 'Comprador'}</span><button type="button" onClick={sair}><LogOut aria-hidden="true" /><span>Sair</span></button></div></aside>
    <div className="app-content"><main id="portal-conteudo" className="page portal-page">
      {erro && <p role="alert" className="form-error">{erro}</p>}
      {!dados && !erro && <p role="status">Carregando suas obras…</p>}
      {secao === "configuracoes" && <ConfiguracoesComprador request={request} />}
      {secao === "obras" && dados && !obra && <><header className="portal-heading"><p className="portal-eyebrow">PORTAL DO COMPRADOR</p><h1>Minhas obras</h1><p>Olá, {dados.nome}. Acompanhe as atualizações das suas obras em um só lugar.</p></header><section aria-labelledby="portal-obras-titulo"><div className="portal-section-heading"><h2 id="portal-obras-titulo">Suas obras</h2><p>{dados.obras.length} {dados.obras.length === 1 ? 'obra vinculada' : 'obras vinculadas'}</p></div>
        {dados.obras.length ? <div className="works-grid portal-works">{dados.obras.map(o => <article className="feature-card work-card portal-work-card" key={o.id}><div className="work-cover"><Building2 aria-hidden="true" /></div><div className="work-card-body"><span className="portal-work-label">Obra residencial</span><h3>{o.nome}</h3>{o.localizacao && <p className="portal-work-location"><MapPin size={16} aria-hidden="true" />{o.localizacao}</p>}<button type="button" className="portal-work-link" disabled={abrindo} onClick={() => abrir(o.id)}>{abrindo ? 'Carregando…' : 'Acompanhar obra'} <ArrowRight size={17} aria-hidden="true" /></button></div></article>)}</div> : <div className="feature-card portal-empty"><Building2 aria-hidden="true" /><h3>Nenhuma obra vinculada</h3><p>Quando a construtora vincular uma obra à sua conta, ela aparecerá aqui.</p></div>}</section></>}
      {secao === "obras" && obra && <><button type="button" className="portal-back" onClick={() => { setObra(null); setSecao('obras'); setErro(''); }}><ArrowLeft size={18} aria-hidden="true" /> Minhas obras</button><header className="portal-heading portal-detail-heading"><p className="portal-eyebrow">ACOMPANHAMENTO DA OBRA</p><h1>{obra.obra.nome}</h1>{obra.obra.localizacao && <p><MapPin size={17} aria-hidden="true" /> {obra.obra.localizacao}</p>}</header><section aria-labelledby="portal-atualizacoes"><div className="portal-section-heading"><div><h2 id="portal-atualizacoes">Atualizações publicadas</h2><p>Acompanhe o progresso e as evidências compartilhadas pela construtora.</p></div></div>
        {!obra.atualizacoes.length ? <div className="feature-card portal-empty"><FileText aria-hidden="true" /><h3>Nenhuma atualização publicada</h3><p>As novidades da sua obra aparecerão aqui quando forem publicadas.</p></div> : <div className="portal-updates">{obra.atualizacoes.map(i => <article className="feature-card portal-update" key={i.id}><div className="portal-update-heading"><div><span className="portal-update-label">ATUALIZAÇÃO DA OBRA</span><h3>{i.marco?.nome || 'Avanço da obra'}</h3></div><span className="portal-update-date"><CalendarDays size={16} aria-hidden="true" /> {formatDate(i.data)}</span></div><p className="portal-update-description">{i.descricao}</p>{i.midias?.length > 0 && <div className="portal-media"><h4>Evidências</h4>{i.midias.map(m => <Midia key={m.id} midia={m} obraId={obra.obra.id} token={token} />)}</div>}</article>)}</div>}</section></>}
    </main></div>
  </div>;
}
function Midia({ midia, obraId, token }) {
  const [url, setUrl] = useState(''); const [erro, setErro] = useState(false);
  useEffect(() => { let objectUrl; const controller = new AbortController();
    createHttpClient({ baseUrl: base, getToken: () => token })(`/portal/obras/${encodeURIComponent(obraId)}/midias/${encodeURIComponent(midia.id)}`, { responseType: 'blob', signal: controller.signal })
      .then(blob => { objectUrl = URL.createObjectURL(blob); if (!controller.signal.aborted) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => { if (!controller.signal.aborted) setErro(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [midia.id, obraId, token]);
  if (erro) return <p>Não foi possível carregar {midia.nome}.</p>;
  if (!url) return <p role="status">Carregando {midia.nome}…</p>;
  if (midia.tipo === 'foto') return <img src={url} alt={midia.nome} />;
  if (midia.tipo === 'video') return <video controls src={url} />;
  return <p><a href={url} download={midia.nome}>Baixar {midia.nome}</a></p>;
}



