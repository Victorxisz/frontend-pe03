export default function AuthAside() {
  return <>
    <div className="auth-paths" aria-hidden="true">
      <svg viewBox="0 0 696 316" preserveAspectRatio="none">
        {[1, -1].flatMap((position) => Array.from({ length: 30 }, (_, i) => <path key={`${position}-${i}`} d={`M -80 ${75 + i * 5} C 120 ${-70 + i * 4 * position}, 220 ${340 - i * 3}, 390 ${165 + i * 3} S 650 ${15 + i * 5}, 780 ${120 + i * 4}`} strokeOpacity={0.16 + i * 0.008} strokeWidth={0.7 + i * 0.025} />))}
      </svg>
    </div>
    <aside className="auth-aside" aria-label="Acompanhamento de obras">
    <div className="auth-aside-copy"><p>Mais clareza para cada etapa da sua obra.</p><small>Organize informações, acompanhe o progresso e mantenha tudo em um só lugar.</small></div>
    </aside>
  </>;
}
