import { useEffect } from 'react';
import { api } from '../data/api.js';
import { useLoad } from '../hooks/useLoad.js';
import { links, navigate } from '../lib/router.js';
import { daysBetween, formatDate, gapLabel, getDomain, isWebUrl, plural } from '../lib/format.js';
import { useFeedback } from '../components/Feedback.jsx';
import { LoadError, Loading, PageHeading } from '../components/Common.jsx';
import { Icon } from '../components/Icon.jsx';

// Small markers on the path when a trail reaches these step counts
const MILESTONES = {
  1: { suit: '♠', label: 'First clue' },
  5: { suit: '♥', label: 'Curiouser and curiouser' },
  10: { suit: '♦', label: 'Ten clues deep' },
  20: { suit: '♣', label: 'Further than most' },
};

export default function TrailPage({ trailId, highlightStep }) {
  const { status, data: trail, error, slow, reload, refresh } = useLoad(() => api.getTrail(trailId), [trailId]);
  const { confirm, showToast } = useFeedback();

  // After saving a discovery, scroll to it so you can see where it landed
  useEffect(() => {
    if (status === 'ready' && highlightStep) {
      document.getElementById(`step-${highlightStep}`)?.scrollIntoView({ block: 'center' });
    }
  }, [status, highlightStep]);

  if (status === 'loading') return slow ? <Loading label="Following the trail…" /> : null;
  if (status === 'error') return <LoadError error={error} onRetry={reload} />;

  const { discoveries } = trail;
  const latest = discoveries[discoveries.length - 1];

  async function deleteTrail() {
    const ok = await confirm({
      title: `Delete “${trail.title}”?`,
      message: `This removes the trail and its ${plural(discoveries.length, 'discovery', 'discoveries')}. It can’t be undone.`,
      confirmLabel: 'Delete trail',
    });
    if (!ok) return;
    try {
      await api.deleteTrail(trail.id);
      showToast('Trail deleted');
      navigate(links.dashboard());
    } catch (err) {
      console.error('[TrailPage] delete trail failed', err);
      showToast(`Couldn’t delete: ${err.message}`, 'error');
    }
  }

  async function deleteDiscovery(discovery) {
    const ok = await confirm({
      title: `Delete “${discovery.title}”?`,
      message: 'It will be removed from this trail, and the steps after it move up. It can’t be undone.',
      confirmLabel: 'Delete discovery',
    });
    if (!ok) return;
    try {
      await api.deleteDiscovery(trail.id, discovery.id);
      showToast('Discovery deleted');
      await refresh();   // redraw in place, without jumping to the top
    } catch (err) {
      console.error('[TrailPage] delete discovery failed', err);
      showToast(`Couldn’t delete: ${err.message}`, 'error');
    }
  }

  return (
    <article className="trail">
      <a className="back-link" href={links.dashboard()}>
        <Icon name="arrow-left" /> Your trails
      </a>

      <header className="trail-head">
        <div className="trail-head__text">
          <p className="eyebrow">Trail · started {formatDate(trail.created)}</p>
          <PageHeading className="trail-head__title">{trail.title}</PageHeading>
          {trail.description && <p className="trail-head__description">{trail.description}</p>}
          <ul className="trail-stats">
            <li><strong>{discoveries.length}</strong> {discoveries.length === 1 ? 'discovery' : 'discoveries'}</li>
            {latest && <li>over <strong>{plural(daysBetween(trail.created, latest.date) + 1, 'day')}</strong></li>}
            <li>updated <strong>{formatDate(trail.updated)}</strong></li>
          </ul>
        </div>
        <div className="trail-head__actions">
          <a className="btn btn--primary" href={links.newDiscovery(trail.id)}>
            <Icon name="plus" /> Add discovery
          </a>
          <div className="trail-head__manage">
            <a className="btn btn--quiet btn--sm" href={links.editTrail(trail.id)}>
              <Icon name="edit" /> Edit trail
            </a>
            <button type="button" className="btn btn--quiet-danger btn--sm" onClick={deleteTrail}>
              <Icon name="trash" /> Delete
            </button>
          </div>
        </div>
      </header>

      <DiscoveryPath trail={trail} highlightStep={highlightStep} onDelete={deleteDiscovery} />
    </article>
  );
}

/* The path: the question at the top in a doorway, each discovery in order
   down a winding line (alternating sides on wide screens), and an open
   doorway at the bottom for the next clue. The background deepens toward
   the bottom, like going further down. */
function DiscoveryPath({ trail, highlightStep, onDelete }) {
  const { discoveries } = trail;

  return (
    <section className={`path${discoveries.length ? '' : ' path--empty'}`} aria-labelledby="path-heading">
      <h2 className="visually-hidden" id="path-heading">Discovery path, oldest first</h2>

      <div className="path__origin">
        <p className="path__origin-label">It started with a question</p>
        <p className="path__question">{trail.question}</p>
        <p className="path__origin-date">{formatDate(trail.created)}</p>
        <svg className="path__keyhole" viewBox="0 0 10 16" aria-hidden="true" focusable="false">
          <circle cx="5" cy="5" r="3.4" />
          <path d="M3.4 7.5h3.2l1.2 7.5H2.2z" />
        </svg>
      </div>

      {discoveries.length > 0 && (
        <ol className="path__steps">
          {discoveries.map((discovery, index) => {
            const step = index + 1;
            const gap = gapLabel(index === 0 ? trail.created : discoveries[index - 1].date, discovery.date);
            const milestone = MILESTONES[step];
            const isLatest = step === discoveries.length;
            const classes = [
              'path-step',
              index % 2 === 0 ? 'path-step--left' : 'path-step--right',
              isLatest && 'is-latest',
              discovery.id === highlightStep && 'is-new',
            ].filter(Boolean).join(' ');

            return (
              <li key={discovery.id} id={`step-${discovery.id}`} className={classes}>
                {gap && <p className="path-step__gap">{gap}</p>}
                <span className="path-step__node" aria-hidden="true">{step}</span>
                <DiscoveryCard trail={trail} discovery={discovery} step={step} isLatest={isLatest} onDelete={onDelete} />
                {milestone && (
                  <p className="path-step__milestone">
                    <span className={`seal${milestone.suit === '♥' || milestone.suit === '♦' ? ' seal--red' : ''}`} aria-hidden="true">
                      {milestone.suit}
                    </span>
                    {milestone.label}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="path__next">
        <p className="eyebrow">{discoveries.length ? 'Next clue' : 'First clue'}</p>
        <p className="path__next-title">
          {discoveries.length ? 'Where did it lead you next?' : 'Where will this question lead?'}
        </p>
        <p className="path__next-text">
          {discoveries.length
            ? 'Add the next website you found and what you learned from it.'
            : 'Save the first useful website you find, with a note about what it taught you.'}
        </p>
        <a className="btn btn--primary" href={links.newDiscovery(trail.id)}>
          <Icon name="plus" /> Add discovery
        </a>
      </div>
    </section>
  );
}

function DiscoveryCard({ trail, discovery, step, isLatest, onDelete }) {
  const domain = getDomain(discovery.url);

  return (
    <article className="find" aria-labelledby={`find-title-${discovery.id}`}>
      <div className="find__head">
        <p className="find__source">
          <span className="find__favicon" aria-hidden="true">{domain.charAt(0)}</span>
          {domain}
        </p>
        <div className="find__tools">
          <a className="icon-btn" href={links.editDiscovery(trail.id, discovery.id)}
             aria-label={`Edit ${discovery.title}`} title="Edit discovery">
            <Icon name="edit" />
          </a>
          <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(discovery)}
                  aria-label={`Delete ${discovery.title}`} title="Delete discovery">
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <h3 className="find__title" id={`find-title-${discovery.id}`}>
        <span className="visually-hidden">Step {step}: </span>{discovery.title}
      </h3>

      {discovery.note
        ? <p className="find__note">{discovery.note}</p>
        : <p className="find__note find__note--empty">No notes yet.</p>}

      <div className="find__foot">
        <time dateTime={String(discovery.date).slice(0, 10)}>{formatDate(discovery.date)}</time>
        {isLatest && <span className="tag">Latest</span>}
        {isWebUrl(discovery.url) && (
          <a className="find__visit" href={discovery.url} target="_blank" rel="noopener noreferrer">
            Visit site <Icon name="external" /><span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
