import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';

const settings = window.__fixture;
const observations = window.__observations = { events: [], errors: [] };

class TransitionBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error: error.message }; }
  componentDidCatch(error) { observations.errors.push(error.message); }
  render() {
    return this.state.error
      ? <p role="alert" data-testid="transition-error">{this.state.error}</p>
      : this.props.children;
  }
}

function Panel({ open, onClose, openRef }) {
  const panelRef = React.useRef(null);
  const closeRef = React.useRef(null);
  return <CSSTransition
    in={open}
    timeout={120}
    classNames="phase"
    unmountOnExit
    {...(settings.nodeRef ? { nodeRef: panelRef } : {})}
    onEnter={(...args) => observations.events.push({
      name: 'enter',
      firstArgument: args[0] instanceof HTMLElement ? 'element' : args[0],
      refMatches: settings.nodeRef ? panelRef.current?.dataset.testid === 'panel' : null,
    })}
    onEntered={() => {
      observations.events.push({ name: 'entered' });
      closeRef.current.focus();
    }}
    onExited={() => {
      observations.events.push({ name: 'exited' });
      openRef.current.focus();
    }}
  >
    <section
      {...(settings.nodeRef ? { ref: panelRef } : {})}
      data-testid="panel"
      className="panel"
      aria-label="Report details"
    >
      <h2>Report details</h2>
      <p>The report draft stays in the form while this panel opens and closes.</p>
      <button ref={closeRef} type="button" onClick={onClose}>Close details</button>
    </section>
  </CSSTransition>;
}

function Dashboard() {
  const location = useLocation();
  const exactReport = location.pathname === '/dashboard/reports';
  return <section aria-label="Dashboard route">
    <nav aria-label="Report navigation">
      <Link data-testid="reports-relative" to={settings.splitRoute ? '../reports' : 'reports'}>
        Reports
      </Link>
      <Link data-testid="reports-absolute" to="/dashboard/reports">Absolute reports control</Link>
    </nav>
    <h2 data-testid="route-title">{exactReport ? 'Reports page' : 'Team page'}</h2>
    <output data-testid="location">{location.pathname}</output>
  </section>;
}

function App() {
  const [value, setValue] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(null);
  return <main>
    <h1>Migration evidence: report workspace</h1>
    <p data-testid="versions">React {React.version}</p>
    <label htmlFor="draft">Draft title</label>
    <input id="draft" value={value} onChange={event => setValue(event.target.value)} />
    <button ref={openRef} type="button" onClick={() => setOpen(true)}>Open details</button>
    <TransitionBoundary>
      <Panel open={open} onClose={() => setOpen(false)} openRef={openRef} />
    </TransitionBoundary>
    <Routes>
      {settings.splitRoute
        ? <Route path="/dashboard"><Route path="*" element={<Dashboard />} /></Route>
        : <Route path="/dashboard/*" element={<Dashboard />} />}
    </Routes>
    <p data-testid="saved-value">Draft: {value}</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
