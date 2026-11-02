import { useId, useLayoutEffect, useRef } from 'react';
import { Button } from './UI';

// Renderizar apenas enquanto a confirmação estiver aberta.
export default function ConfirmDialog({ title, children, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, busy = false, error, returnFocusRef }) {
  const dialog = useRef(null);
  const cancel = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (element.isConnected && element.open) return;
        if (previous?.isConnected && !previous.disabled) previous.focus({ preventScroll: true });
        else returnFocusRef?.current?.focus({ preventScroll: true });
      });
    };
  }, [returnFocusRef]);
  function containFocus(event) {
    if (event.key !== 'Tab') return;
    const elements = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')];
    if (!elements.length) { event.preventDefault(); dialog.current.focus(); return; }
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <dialog ref={dialog} className="modal confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} aria-modal="true"
    tabIndex={-1} onKeyDown={containFocus}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <header><h2 id={titleId}>{title}</h2></header>
    <div className="modal-body"><div id={descriptionId}>{children}</div>{error && <p role="alert" className="form-error">{error}</p>}</div>
    <footer><Button ref={cancel} variant="secondary" disabled={busy} onClick={onCancel}>{cancelLabel}</Button><Button variant="danger" loading={busy} onClick={onConfirm}>{busy ? 'Aguarde…' : confirmLabel}</Button></footer>
  </dialog>;
}
