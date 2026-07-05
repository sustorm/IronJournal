import { memo } from 'react';

function SyncIndicator({ sync }) {
  if (!sync.state) return <span className="sync-indicator" />;
  return (
    <span className={`sync-indicator ${sync.state === 'ok' ? 'ok' : sync.state === 'err' ? 'err' : 'syncing'}`}>
      {sync.msg}
    </span>
  );
}

const SUB_PAGE_TITLES = {
  edit: 'Edit Program',
  progress: 'Progress',
  chat: 'AI Coach',
};

function TopBar({ sync, currentScreen, debugMode, onShowEdit, onShowProgress, onShowChat, onBack }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const subPageTitle = SUB_PAGE_TITLES[currentScreen];

  if (subPageTitle) {
    return (
      <div className="topbar">
        <div className="topbar-subpage-title">{subPageTitle}</div>
        <button onClick={onBack} style={{
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--muted)', fontFamily: "'DM Mono', monospace",
          fontSize: 'var(--fs-xs)', letterSpacing: '1px', textTransform: 'uppercase',
          padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>← Back</button>
      </div>
    );
  }

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">
          <span style={{ color: 'var(--accent)' }}>IRON</span>{' '}
          <span style={{ color: '#e0e0ee', fontWeight: 600, letterSpacing: '2px' }}>JOURNAL</span>
        </div>
        <div className="topbar-date">
          {debugMode && (
            <span style={{
              display: 'inline-block',
              marginRight: '8px',
              padding: '1px 7px',
              borderRadius: '10px',
              background: 'rgba(255,85,102,.18)',
              border: '1px solid #ff556655',
              color: '#ff5566',
              fontSize: '10px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
              verticalAlign: 'middle',
            }}>
              DEBUG
            </span>
          )}
          {today}
        </div>
      </div>
      <div className="topbar-right">
        {!debugMode && <SyncIndicator sync={sync} />}
        <button
          className={`icon-btn${currentScreen === 'edit' ? ' active' : ''}`}
          onClick={onShowEdit}
          title="Edit program"
        >
          ✏️
        </button>
        <button
          className={`icon-btn${currentScreen === 'progress' ? ' active' : ''}`}
          onClick={onShowProgress}
          title="Progress"
        >
          📊
        </button>
        <button
          className={`icon-btn${currentScreen === 'chat' ? ' active' : ''}`}
          onClick={onShowChat}
          title="AI Coach"
        >
          💬
        </button>
      </div>
    </div>
  );
}

export default memo(TopBar);
