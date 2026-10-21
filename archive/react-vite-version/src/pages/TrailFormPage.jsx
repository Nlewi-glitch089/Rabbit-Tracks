import { useState } from 'react';
import { api } from '../data/api.js';
import { useLoad } from '../hooks/useLoad.js';
import { backTarget, links, navigate, parseRoute } from '../lib/router.js';
import { useFeedback } from '../components/Feedback.jsx';
import { Field, LoadError, Loading, PageHeading, describeSaveError } from '../components/Common.jsx';
import { DoorMark } from '../components/Illustrations.jsx';
import { Icon } from '../components/Icon.jsx';

// Create (#/trails/new) and edit (#/trails/ID/edit) share this screen
export default function TrailFormPage({ trailId, initialQuestion = '', previous }) {
  const editing = Boolean(trailId);
  const { status, data: trail, error, slow, reload } = useLoad(
    () => (editing ? api.getTrail(trailId) : Promise.resolve(null)),
    [trailId],
  );

  if (status === 'loading') return slow ? <Loading label="Opening the trail…" /> : null;
  if (status === 'error') return <LoadError error={error} onRetry={reload} />;

  const back = backTarget(previous, editing ? links.trail(trailId) : links.dashboard());
  return <TrailForm trail={trail} initialQuestion={initialQuestion} back={back} />;
}

function TrailForm({ trail, initialQuestion, back }) {
  const editing = Boolean(trail);
  const { showToast } = useFeedback();
  const [values, setValues] = useState({
    question: trail ? trail.question : initialQuestion,
    title: trail ? trail.title : '',
    description: trail ? trail.description || '' : '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const backLabel = parseRoute(back).name === 'trail' ? 'Back to the trail' : 'Your trails';

  // Typing in a field clears its error
  const change = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const data = {
      question: values.question.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
    };

    const found = {};
    if (!data.question) found.question = 'Write down the question you’re trying to answer.';
    if (!data.title) found.title = 'Give the trail a short name.';
    setErrors(found);
    setSaveError('');

    const firstProblem = ['question', 'title'].find((field) => found[field]);
    if (firstProblem) {
      document.getElementById(`trail-${firstProblem}`).focus();
      return;
    }

    setSaving(true);
    try {
      const saved = editing ? await api.updateTrail(trail.id, data) : await api.createTrail(data);
      showToast(editing ? 'Trail updated' : 'Trail started');
      navigate(links.trail(saved.id));
    } catch (err) {
      console.error('[TrailForm] save failed', err);
      setSaveError(describeSaveError(err));
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <a className="back-link" href={back}><Icon name="arrow-left" /> {backLabel}</a>

      <div className="form-card form-card--arched">
        <header className="form-card__head">
          <DoorMark className="form-card__mark" />
          <p className="eyebrow">{editing ? 'Edit trail' : 'New trail'}</p>
          {/* If a question came from the dashboard, focus goes to the name field instead */}
          <PageHeading className="form-card__title" autoFocus={!initialQuestion || editing}>
            {editing ? 'Edit this trail' : 'Every trail starts with a question'}
          </PageHeading>
          <p className="form-card__intro">
            {editing
              ? 'Changes apply to the trail itself. Its discoveries stay where they are.'
              : 'Write down what you want to find out. You’ll add websites to the trail as you find them.'}
          </p>
        </header>

        {saveError && <p className="form-alert" role="alert">{saveError}</p>}

        <form noValidate onSubmit={handleSubmit}>
          <Field id="trail-question" label="What do you want to find out?" required
                 hint="The question that started this." error={errors.question}>
            {(props) => (
              <input {...props} className="input input--question" value={values.question} onChange={change('question')}
                     maxLength={140} autoComplete="off" placeholder="How are video games made?" />
            )}
          </Field>

          <Field id="trail-title" label="Trail name" required
                 hint="A short name you’ll recognize in your list." error={errors.title}>
            {(props) => (
              <input {...props} className="input" value={values.title} onChange={change('title')}
                     maxLength={80} autoComplete="off" placeholder="Exploring Game Development"
                     autoFocus={Boolean(initialQuestion) && !editing} />
            )}
          </Field>

          <Field id="trail-description" label="Description" hint="Why you started, or what you hope to learn.">
            {(props) => (
              <textarea {...props} className="input" rows={3} value={values.description} onChange={change('description')}
                        maxLength={300} />
            )}
          </Field>

          <div className="form-actions">
            <a className="btn btn--quiet" href={back}>Cancel</a>
            <button type="submit" className="btn btn--primary" disabled={saving} aria-busy={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Start trail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
