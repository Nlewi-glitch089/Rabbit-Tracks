import { useEffect, useState } from 'react';
import { useHashRoute, links } from './lib/router.js';
import { usingSampleData } from './data/api.js';
import { FeedbackProvider } from './components/Feedback.jsx';
import { SettingsDialog } from './components/SettingsDialog.jsx';
import { NotFound } from './components/Common.jsx';
import { DoorMark } from './components/Illustrations.jsx';
import { Icon } from './components/Icon.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TrailPage from './pages/TrailPage.jsx';
import TrailFormPage from './pages/TrailFormPage.jsx';
import DiscoveryFormPage from './pages/DiscoveryFormPage.jsx';

export default function App() {
  const { hash, route, previous } = useHashRoute();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Bumped after Settings changes the data, so the current screen reloads
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  return (
    <FeedbackProvider>
      {/* Not a normal #main link, because # addresses are used for screens */}
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main').focus();
        }}
      >
        Skip to main content
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href={links.dashboard()} aria-label="Rabbit Trails, your trails">
            <DoorMark className="brand__mark" />
            <span className="brand__name">Rabbit <em>Trails</em></span>
          </a>
          <nav className="site-nav" aria-label="Main">
            <a className="site-nav__link" href={links.dashboard()} aria-current={route.name === 'dashboard' ? 'page' : undefined}>
              Your trails
            </a>
            <a className="btn btn--primary btn--sm" href={links.newTrail()}>
              <Icon name="plus" /> New trail
            </a>
            <button type="button" className="icon-btn site-nav__settings" onClick={() => setSettingsOpen(true)}
                    aria-label="Settings" aria-haspopup="dialog">
              <Icon name="settings" />
            </button>
          </nav>
        </div>
      </header>

      <main id="main" className="page" tabIndex={-1}>
        {/* key: each address gets a fresh screen, so form state never leaks between screens */}
        <Screen key={`${hash}#${dataVersion}`} route={route} previous={previous} />
      </main>

      <footer className="site-footer">
        <p className="site-footer__brand">Rabbit Trails</p>
        {usingSampleData && <p>Your trails are saved in this browser.</p>}
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDataChanged={() => {
          window.location.hash = links.dashboard();
          setDataVersion((n) => n + 1);
        }}
      />
    </FeedbackProvider>
  );
}

function Screen({ route, previous }) {
  switch (route.name) {
    case 'dashboard':
      return <Dashboard />;
    case 'trail':
      return <TrailPage trailId={route.trailId} highlightStep={route.step} />;
    case 'trail-new':
      return <TrailFormPage initialQuestion={route.question} previous={previous} />;
    case 'trail-edit':
      return <TrailFormPage trailId={route.trailId} previous={previous} />;
    case 'discovery-new':
      return <DiscoveryFormPage trailId={route.trailId} />;
    case 'discovery-edit':
      return <DiscoveryFormPage trailId={route.trailId} discoveryId={route.discoveryId} />;
    default:
      return <NotFound />;
  }
}
