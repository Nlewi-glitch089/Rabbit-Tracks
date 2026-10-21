import { useState } from 'react';
import { api } from '../data/api.js';
import { useLoad } from '../hooks/useLoad.js';
import { links, navigate } from '../lib/router.js';
import { daysBetween, formatDate, formatShortDate, getDomain, plural } from '../lib/format.js';
import { useFeedback } from '../components/Feedback.jsx';
import { LoadError, Loading, PageHeading } from '../components/Common.jsx';
import { DoorScene } from '../components/Illustrations.jsx';
import { TrailMap } from '../components/TrailMap.jsx';
import { Icon } from '../components/Icon.jsx';

const byMostRecent = (a, b) => String(b.updated).localeCompare(String(a.updated));

export default function Dashboard() {
  const { status, data: trails, error, slow, reload, refresh } = useLoad(() => api.listTrails(), []);
  const { confirm, showToast } = useFeedback();

  if (status === 'loading') return slow ? <Loading label="Gathering your trails…" /> : null;
  if (status === 'error') return <LoadError error={error} onRetry={reload} notFound={false} />;

  const [current, ...others] = [...trails].sort(byMostRecent);
  const discoveryTotal = trails.reduce((sum, trail) => sum + trail.discoveries.length, 0);

  async function deleteTrail(trail) {
    const ok = await confirm({
      title: `Delete “${trail.title}”?`,
      message: `This removes the trail and its ${plural(trail.discoveries.length, 'discovery', 'discoveries')}. It can’t be undone.`,
      confirmLabel: 'Delete trail',
    });
    if (!ok) return;
    try {
      await api.deleteTrail(trail.id);
      showToast('Trail deleted');
      await refresh();
    } catch (err) {
      console.error('[Dashboard] delete failed', err);
      showToast(`Couldn’t delete: ${err.message}`, 'error');
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard__intro">
        <div>
          <PageHeading className="dashboard__title">Your trails</PageHeading>
          <p className="dashboard__summary">
            {trails.length
              ? `${plural(trails.length, 'trail')} · ${plural(discoveryTotal, 'discovery', 'discoveries')}`
              : 'Nothing here yet.'}
          </p>
        </div>
        <QuestionStarter />
      </div>

      {current ? (
        <>
          <ContinueCard trail={current} />
          {others.length > 0 && (
            <section aria-labelledby="other-trails">
              <h2 className="section-heading" id="other-trails">Other trails</h2>
              <ul className="trail-grid">
                {others.map((trail) => (
                  <li key={trail.id}>
                    <TrailCard trail={trail} onDelete={() => deleteTrail(trail)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <EmptyDashboard />
      )}
    </div>
  );
}

/* Typing a question here opens the new-trail form with it filled in,
   because every trail starts with a question. */
function QuestionStarter() {
  const [question, setQuestion] = useState('');

  return (
    <form
      className="starter"
      onSubmit={(event) => {
        event.preventDefault();
        navigate(links.newTrail(question.trim()));
      }}
    >
      <label className="starter__label" htmlFor="starter-question">Start a new trail</label>
      <div className="starter__row">
        <input
          id="starter-question"
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What are you curious about?"
          maxLength={140}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary">Begin</button>
      </div>
    </form>
  );
}

// The most recently active trail, shown large so it's easy to pick back up
function ContinueCard({ trail }) {
  const count = trail.discoveries.length;
  const latest = trail.discoveries[count - 1];
  const span = latest ? daysBetween(trail.created, latest.date) + 1 : 0;

  return (
    <section className="continue" aria-labelledby="continue-title">
      <div className="continue__text">
        <p className="eyebrow">Pick up where you left off</p>
        <h2 className="continue__title" id="continue-title">
          <a href={links.trail(trail.id)}>{trail.title}</a>
        </h2>
        <p className="continue__question">{trail.question}</p>

        {latest ? (
          <div className="continue__latest">
            <p className="continue__latest-label">Latest discovery · {formatDate(latest.date)}</p>
            <p className="continue__latest-title">{latest.title}</p>
            <p className="continue__latest-domain">{getDomain(latest.url)}</p>
          </div>
        ) : (
          <p className="continue__latest continue__latest--empty">No discoveries yet. Where will this question lead?</p>
        )}

        <div className="continue__actions">
          <a className="btn btn--primary" href={links.trail(trail.id)}>
            Open trail <Icon name="arrow-right" />
          </a>
          <a className="btn btn--secondary" href={links.newDiscovery(trail.id)}>
            <Icon name="plus" /> Add discovery
          </a>
        </div>
      </div>

      <div className="continue__map">
        <TrailMap count={count} max={10} width={420} height={96} dot={7} />
        <p className="continue__map-caption">
          {count ? `${plural(count, 'discovery', 'discoveries')} over ${plural(span, 'day')}` : 'Just the question so far'}
        </p>
      </div>
    </section>
  );
}

function TrailCard({ trail, onDelete }) {
  const count = trail.discoveries.length;
  const latest = trail.discoveries[count - 1];

  return (
    <article className="trail-card">
      <div className="trail-card__head">
        <h3 className="trail-card__title">
          <a className="trail-card__link" href={links.trail(trail.id)}>{trail.title}</a>
        </h3>
        <div className="trail-card__tools">
          <a className="icon-btn" href={links.editTrail(trail.id)} aria-label={`Edit ${trail.title}`} title="Edit trail">
            <Icon name="edit" />
          </a>
          <button type="button" className="icon-btn icon-btn--danger" onClick={onDelete}
                  aria-label={`Delete ${trail.title}`} title="Delete trail">
            <Icon name="trash" />
          </button>
        </div>
      </div>
      <p className="trail-card__question">{trail.question}</p>
      <TrailMap count={count} className="trail-card__map" />
      <p className="trail-card__latest">
        {latest ? <>Latest: <span>{latest.title}</span></> : 'No discoveries yet'}
      </p>
      <p className="trail-card__meta">
        <span>{plural(count, 'discovery', 'discoveries')}</span>
        <span>Updated {formatShortDate(trail.updated)}</span>
      </p>
    </article>
  );
}

function EmptyDashboard() {
  return (
    <section className="empty" aria-labelledby="empty-title">
      <DoorScene className="empty__art" />
      <h2 className="empty__title" id="empty-title">No trails yet</h2>
      <p className="empty__text">
        Every trail starts with a question. Ask one above, then save the websites you find as you go.
      </p>
      <a className="btn btn--primary" href={links.newTrail()}>
        <Icon name="plus" /> Start your first trail
      </a>
    </section>
  );
}
