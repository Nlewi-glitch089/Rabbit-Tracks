/* Toasts ("Discovery added") and the delete confirmation dialog,
   available anywhere through useFeedback(). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const FeedbackContext = createContext(null);

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [request, setRequest] = useState(null);
  const requestRef = useRef(null);
  const toastTimer = useRef();

  const showToast = useCallback((message, tone = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  // Resolves to true for the confirm button, false for Cancel or Esc
  const confirm = useCallback((options) => new Promise((resolve) => {
    requestRef.current = { icon: 'trash', ...options, resolve };
    setRequest(requestRef.current);
  }), []);

  const answer = useCallback((value) => {
    requestRef.current?.resolve(value);
    requestRef.current = null;
    setRequest(null);
  }, []);

  const value = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ConfirmDialog request={request} onAnswer={answer} />
      <div className={`toast${toast ? ' is-visible' : ''}${toast?.tone === 'error' ? ' toast--error' : ''}`} role="status" aria-live="polite">
        {toast?.message}
      </div>
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({ request, onAnswer }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  return (
    <dialog
      ref={ref}
      className="sheet confirm"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      // Esc key: treat as Cancel
      onCancel={(event) => { event.preventDefault(); onAnswer(false); }}
    >
      {request && (
        <>
          <div className="confirm__body">
            <span className={`confirm__icon${request.tone === 'neutral' ? ' confirm__icon--neutral' : ''}`}>
              <Icon name={request.icon} />
            </span>
            <div>
              <h2 className="confirm__title" id="confirm-title">{request.title}</h2>
              <p className="confirm__message" id="confirm-message">{request.message}</p>
            </div>
          </div>
          <div className="confirm__actions">
            {/* Cancel comes first so it gets focus when the dialog opens */}
            <button type="button" className="btn btn--secondary" onClick={() => onAnswer(false)}>Cancel</button>
            <button type="button" className={`btn ${request.tone === 'neutral' ? 'btn--primary' : 'btn--danger'}`} onClick={() => onAnswer(true)}>
              {request.confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
