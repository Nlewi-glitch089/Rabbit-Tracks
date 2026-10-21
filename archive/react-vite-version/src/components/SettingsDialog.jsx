import { useEffect, useRef } from 'react';
import { usingSampleData, SampleStore, API_BASE_URL } from '../data/api.js';
import { useFeedback } from './Feedback.jsx';
import { Icon } from './Icon.jsx';

export function SettingsDialog({ open, onClose, onDataChanged }) {
  const ref = useRef(null);
  const { confirm, showToast } = useFeedback();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function run(action) {
    const ok = await confirm(action.confirm);
    if (!ok) return;
    try {
      await action.run();
      onClose();
      showToast(action.done);
      onDataChanged();
    } catch (error) {
      console.error('[Settings] action failed', error);
      showToast(`Couldn’t finish: ${error.message}`, 'error');
    }
  }

  const reset = {
    run: () => SampleStore.reset(),
    done: 'Sample trails restored',
    confirm: {
      title: 'Reset sample data?',
      message: 'Everything you’ve added, edited, or deleted will be replaced with the four example trails.',
      confirmLabel: 'Reset',
      icon: 'reset',
      tone: 'neutral',
    },
  };

  const clear = {
    run: () => SampleStore.clear(),
    done: 'All trails cleared',
    confirm: {
      title: 'Clear all trails?',
      message: 'Every trail and discovery will be removed. You can bring the examples back with Reset sample data.',
      confirmLabel: 'Clear all',
    },
  };

  return (
    <dialog
      ref={ref}
      className="sheet settings"
      aria-labelledby="settings-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      // Clicking the dimmed backdrop closes it
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
    >
      <header className="sheet__head">
        <h2 className="sheet__title" id="settings-title">Settings</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
          <Icon name="close" />
        </button>
      </header>

      <p className="settings__note">
        {usingSampleData
          ? 'Trails are stored in this browser for now.'
          : `Connected to the Rabbit Trails API (${API_BASE_URL}).`}
      </p>

      {usingSampleData && (
        <ul className="settings__list">
          <li className="settings__row">
            <div>
              <p className="settings__label">Reset sample data</p>
              <p className="settings__hint">Start over with the four example trails.</p>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => run(reset)}>Reset</button>
          </li>
          <li className="settings__row">
            <div>
              <p className="settings__label">Clear all trails</p>
              <p className="settings__hint">Remove everything and see the empty dashboard.</p>
            </div>
            <button type="button" className="btn btn--danger-outline btn--sm" onClick={() => run(clear)}>Clear all</button>
          </li>
        </ul>
      )}
    </dialog>
  );
}
