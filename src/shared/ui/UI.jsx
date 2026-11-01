import { useEffect, useId, useRef } from "react";
import { X, FolderOpen } from "lucide-react";

export const statusNames = {
  andamento: "Em andamento",
  planejamento: "Planejamento",
  pausada: "Pausada",
  concluida: "Concluída",
  concluido: "Concluído",
  futuro: "Futuro",
};
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(+date) ? value : date.toLocaleDateString("pt-BR");
}
export function Button({
  variant = "primary",
  className = "",
  icon: Icon,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}
export function StatusBadge({ status, children }) {
  return (
    <span className={`status-badge status-${status || "futuro"}`}>
      <i />
      {children || statusNames[status] || status}
    </span>
  );
}
export function Field({ label, children, className = "" }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function EmptyState({
  title = "Nenhum resultado encontrado",
  description,
  children,
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={28} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Modal({ title, onClose, children, footer, wide = false }) {
  const id = useId();
  const dialog = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("input,select,textarea,button")?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const els = [
          ...dialog.current.querySelectorAll(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
          ),
        ];
        if (!els.length) return;
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0].focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`modal ${wide ? "modal-wide" : ""}`}
      >
        <header>
          <h2 id={id}>{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}
