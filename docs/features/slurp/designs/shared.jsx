// shared.jsx — small shared bits across all four directions
// Compact iPhone frame, common icons, helpers

// Compact phone frame ~ 280x570 — just enough chrome to read as iPhone
function MiniPhone({ children, bg = '#000', notch = '#000', radius = 36, w = 280, h = 570, statusColor = '#000', time = '9:41', noStatus = false }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: bg, padding: 6, boxSizing: 'border-box',
      boxShadow: '0 22px 50px -22px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.6) inset',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: radius - 6,
        overflow: 'hidden', position: 'relative', background: '#fff',
      }}>
        {!noStatus && <MiniStatus color={statusColor} time={time} />}
        {/* dynamic island */}
        <div style={{
          position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
          width: 84, height: 22, borderRadius: 999, background: notch, zIndex: 30,
        }} />
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function MiniStatus({ color = '#000', time = '9:41' }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 36,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px', zIndex: 25, color, fontFamily: '-apple-system, system-ui',
      fontSize: 12, fontWeight: 600, paddingTop: 10,
    }}>
      <div>{time}</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <svg width="14" height="9" viewBox="0 0 14 9"><rect x="0" y="5" width="2.5" height="4" rx=".5" fill={color}/><rect x="3.7" y="3.2" width="2.5" height="5.8" rx=".5" fill={color}/><rect x="7.4" y="1.4" width="2.5" height="7.6" rx=".5" fill={color}/><rect x="11.1" y="0" width="2.5" height="9" rx=".5" fill={color}/></svg>
        <svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="0.5" width="18" height="9" rx="2.5" stroke={color} fill="none" strokeOpacity=".5"/><rect x="2" y="2" width="15" height="6" rx="1" fill={color}/></svg>
      </div>
    </div>
  );
}

// A small caption shown above each phone frame
function FrameLabel({ children, color = 'rgba(60,50,40,.7)' }) {
  return (
    <div style={{
      fontFamily: '-apple-system, system-ui', fontSize: 11, fontWeight: 500,
      color, letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 8, paddingLeft: 4,
    }}>
      {children}
    </div>
  );
}

// Two-column row of phone frames inside a DCArtboard
function PhoneRow({ children, gap = 18 }) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>
      {children}
    </div>
  );
}

// Bottom tab strip — minimal, used by tab landing screens
function MiniTabBar({ active = 2, items, bg = '#fff', tint = '#000', dim = 'rgba(0,0,0,0.35)', topBorder = 'rgba(0,0,0,0.08)', height = 60 }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height,
      display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      background: bg, borderTop: `1px solid ${topBorder}`,
      paddingBottom: 14, alignItems: 'center', justifyItems: 'center',
      zIndex: 20,
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: i === active ? tint : dim,
          fontSize: 9, fontWeight: 600, fontFamily: '-apple-system, system-ui',
          letterSpacing: '0.04em', textTransform: 'uppercase',
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{it.glyph}</span>
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// Tiny progress meter
function Progress({ value, max, fg = '#000', bg = 'rgba(0,0,0,0.08)', h = 8, radius = 999 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%', height: h, background: bg, borderRadius: radius, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: fg, borderRadius: radius }} />
    </div>
  );
}

Object.assign(window, { MiniPhone, MiniStatus, FrameLabel, PhoneRow, MiniTabBar, Progress });
