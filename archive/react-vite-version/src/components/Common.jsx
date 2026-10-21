/* Pieces shared by several screens: the focused page heading, form
   fields, and the loading / error / not-found panels. */

import { useEffect, useRef } from 'react';
import { DoorScene } from './Illustrations.jsx';
import { links } from '../lib/router.js';

/* Each screen's <h1> takes focus when the screen opens, so keyboard and
   screen reader users know the page changed. */
export function PageHeading({ children, className = '', autoFocus = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return <h1 ref={ref} tabIndex={-1} className={className}>{children}</h1>;
}

/* Label + input + hint + error, wired together for screen readers.
   `children` is a function that receives the props for the input itself. */
export function Field({ id, label, required = false, tag, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const tagText = tag !== undefined ? tag : required ? 'Required' : 'Optional';

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {tagText && <span className={`field__tag${required ? ' field__tag--required' : ''}`}>{tagText}</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <p className="field__hint" id={hintId}>{hint}</p>}
      {error && <p className="field__error" id={errorId}>{error}</p>}
    </div>
  );
}

export function StatusPanel({ kind, eyebrow, title, message, children }) {
  const scene = kind === 'loading' ? 'loading' : kind === 'not-found' ? 'closed' : kind === 'error' ? 'error' : 'open';
  return (
    <section className={`status status--${kind}`} aria-busy={kind === 'loading' || undefined}>
      <DoorScene variant={scene} className="status__art" />
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <PageHeading className="status__title">{title}</PageHeading>
      {message && <p className="status__message">{message}</p>}
      {children && <div className="status__actions">{children}</div>}
    </section>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <StatusPanel kind="loading" title={label} />;
}

export function NotFound() {
  return (
    <StatusPanel kind="not-found" eyebrow="A dead end" title="This trail isn’t here"
                 message="It may have been deleted, or the link is wrong.">
      <a className="btn btn--primary" href={links.dashboard()}>Back to your trails</a>
    </StatusPanel>
  );
}

/* What to show when loading fails: "not found" for 404s, otherwise an error with a retry button.
   The dashboard passes notFound={false}: a 404 on the trail list means the API is missing,
   not that a trail was deleted. */
export function LoadError({ error, onRetry, notFound = true }) {
  if (notFound && error?.status === 404) return <NotFound />;
  return (
    <StatusPanel kind="error" eyebrow="Something went wrong" title="We couldn’t load this"
                 message={error?.message || 'Please try again.'}>
      <button type="button" className="btn btn--primary" onClick={onRetry}>Try again</button>
      <a className="btn btn--secondary" href={links.dashboard()}>Back to your trails</a>
    </StatusPanel>
  );
}

// Message for the alert above a form when saving fails
export function describeSaveError(error) {
  if (error.status === 0) return error.message;
  return `Couldn’t save: ${error.message || 'something went wrong.'} Your changes are still here, so you can try again.`;
}
