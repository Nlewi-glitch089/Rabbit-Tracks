import { useState } from 'react';
import { api } from '../data/api.js';
import { useLoad } from '../hooks/useLoad.js';
import { links, navigate } from '../lib/router.js';
import { isWebUrl } from '../lib/format.js';
import { useFeedback } from '../components/Feedback.jsx';
import { Field, LoadError, Loading, NotFound, PageHeading, describeSaveError } from '../components/Common.jsx';
import { Icon } from '../components/Icon.jsx';

// Add (#/trails/ID/discoveries/new) and edit (#/trails/ID/discoveries/ID/edit) share this screen
export default function DiscoveryFormPage({ trailId, discoveryId }) {
  const { status, data: trail, error, slow, reload } = useLoad(() => api.getTrail(trailId), [trailId]);

  if (status === 'loading') return slow ? <Loading label="Opening the trail…" /> : null;
  if (status === 'error') return <LoadError error={error} onRetry={reload} />;

  const discovery = discoveryId ? trail.discoveries.find((d) => d.id === discoveryId) : null;
  if (discoveryId && !discovery) return <NotFound />;

  return <DiscoveryForm trail={trail} discovery={discovery} />;
}

function DiscoveryForm({ trail, discovery }) {
  const editing = Boolean(discovery);
  const { showToast } = useFeedback();

  // The other discoveries on the trail, in order (without this one when editing)
  const others = trail.discoveries.filter((d) => d.id !== discovery?.id);
  const lastPosition = others.length + 1;

  const [values, setValues] = useState({
    url: discovery ? discovery.url : '',
    title: discovery ? discovery.title : '',
    note: discovery ? discovery.note || '' : '',
    position: editing ? trail.discoveries.indexOf(discovery) + 1 : lastPosition,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const change = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const data = {
      url: values.url.trim(),
      title: values.title.trim(),
      note: values.note.trim(),
      position: Number(values.position),
    };

    const found = {};
    if (!data.url) found.url = 'Paste the website’s address.';
    else if (!isWebUrl(data.url)) found.url = 'Use the full address, starting with https:// or http://';
    if (!data.title) found.title = 'Add the page’s title so you can recognize it later.';
    setErrors(found);
    setSaveError('');

    const firstProblem = ['url', 'title'].find((field) => found[field]);
    if (firstProblem) {
      document.getElementById(`discovery-${firstProblem}`).focus();
      return;
    }

    setSaving(true);
    try {
      const saved = editing
        ? await api.updateDiscovery(trail.id, discovery.id, data)
        : await api.createDiscovery(trail.id, data);
      showToast(editing ? 'Discovery updated' : `Added as step ${data.position}`);
      navigate(links.trail(trail.id, saved.id));
    } catch (err) {
      console.error('[DiscoveryForm] save failed', err);
      setSaveError(describeSaveError(err));
      setSaving(false);
    }
  }

  return (
    <div className="form-page form-page--wide">
      <a className="back-link" href={links.trail(trail.id)}><Icon name="arrow-left" /> Back to the trail</a>

      <div className="discovery-layout">
        <div className="form-card">
          <header className="form-card__head form-card__head--left">
            <p className="eyebrow">{trail.title}</p>
            <PageHeading className="form-card__title">{editing ? 'Edit discovery' : 'Add a discovery'}</PageHeading>
            <p className="form-card__intro">
              {editing
                ? 'Update the details, or move it to a different place on the trail.'
                : 'Save a website you found and what it taught you. It becomes the next step on the trail.'}
            </p>
          </header>

          {saveError && <p className="form-alert" role="alert">{saveError}</p>}

          <form noValidate onSubmit={handleSubmit}>
            <Field id="discovery-url" label="Website address" required
                   hint="Copy it from your browser’s address bar." error={errors.url}>
              {(props) => (
                <input {...props} className="input" type="url" inputMode="url" value={values.url} onChange={change('url')}
                       autoComplete="off" placeholder="https://" />
              )}
            </Field>

            <Field id="discovery-title" label="Page title" required error={errors.title}>
              {(props) => (
                <input {...props} className="input" value={values.title} onChange={change('title')}
                       maxLength={120} autoComplete="off" placeholder="A tour of the C# language" />
              )}
            </Field>

            <Field id="discovery-note" label="What did you learn?"
                   hint="A sentence or two is enough. Future you will thank you.">
              {(props) => (
                <textarea {...props} className="input" rows={4} value={values.note} onChange={change('note')}
                          maxLength={500} placeholder="Why was this useful? Where did it point you next?" />
              )}
            </Field>

            {others.length > 0 && (
              <Field id="discovery-position" label="Place on the trail" tag={null}
                     hint={editing ? undefined : 'New discoveries go at the end. Pick an earlier step if you found this before something else.'}>
                {(props) => (
                  <select {...props} className="input select" value={values.position} onChange={change('position')}>
                    {Array.from({ length: lastPosition }, (_, i) => {
                      const position = i + 1;
                      const after = position === 1 ? 'right after the question' : `after “${others[position - 2].title}”`;
                      return (
                        <option key={position} value={position}>
                          Step {position}, {after}{position === lastPosition ? ' (latest)' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </Field>
            )}

            <div className="form-actions">
              <a className="btn btn--quiet" href={links.trail(trail.id)}>Cancel</a>
              <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to trail'}
              </button>
            </div>
          </form>
        </div>

        <PathPreview trail={trail} others={others} position={Number(values.position)} title={values.title} />
      </div>
    </div>
  );
}

/* Shows where this discovery will sit: the question, the steps just
   before it, this one, and the next step after. Updates as you type
   and when you change "Place on the trail". */
function PathPreview({ trail, others, position, title }) {
  const before = others.slice(0, position - 1);
  const after = others.slice(position - 1);
  const shownBefore = before.slice(-2);
  const hiddenCount = before.length - shownBefore.length;

  return (
    <aside className="preview" aria-label="Where this discovery goes on the trail">
      <p className="eyebrow">Where it goes</p>
      <ol className="preview__list">
        <li className="preview__item preview__item--question">
          <span className="preview__marker" aria-hidden="true">?</span>
          <span className="preview__text">{trail.question}</span>
        </li>
        {hiddenCount > 0 && (
          <li className="preview__item preview__item--more">
            <span className="preview__marker" aria-hidden="true">⋮</span>
            <span className="preview__text">{hiddenCount} earlier {hiddenCount === 1 ? 'step' : 'steps'}</span>
          </li>
        )}
        {shownBefore.map((d, i) => (
          <li key={d.id} className="preview__item">
            <span className="preview__marker" aria-hidden="true">{hiddenCount + i + 1}</span>
            <span className="preview__text">{d.title}</span>
          </li>
        ))}
        <li className="preview__item preview__item--this" aria-current="step">
          <span className="preview__marker" aria-hidden="true">{position}</span>
          <span className="preview__text"><strong>{title.trim() || 'This discovery'}</strong></span>
        </li>
        {after[0] && (
          <li className="preview__item">
            <span className="preview__marker" aria-hidden="true">{position + 1}</span>
            <span className="preview__text">{after[0].title}</span>
          </li>
        )}
        {after.length > 1 && (
          <li className="preview__item preview__item--more">
            <span className="preview__marker" aria-hidden="true">⋮</span>
            <span className="preview__text">{after.length - 1} more after</span>
          </li>
        )}
      </ol>
    </aside>
  );
}
