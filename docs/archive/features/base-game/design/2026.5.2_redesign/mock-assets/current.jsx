// current.jsx — faithful-ish recreation of the current Hub home screen
// Pulled from app/(tabs)/index.tsx + Masthead + theme tokens.

const C_CUR = {
  ink: '#1a2030',
  paper: '#e8eef3',
  paperDark: '#d8e1ea',
  paperDarker: '#c4d0dc',
  rule: '#2a3548',
  accent: '#b84a35',
  gold: '#b8902c',
  green: '#4a7a3e',
  muted: '#5a6878',
  onDark: '#e8eef3',
  onDarkDim: '#b8c4d4',
};

const F_CUR = {
  serif: 'Fraunces, Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

const CURRENT_GAMES = [
  {
    num: 'N° 01',
    section: 'Finish The Headline',
    title: 'The Lede',
    tagline: "Three reporters offer competing endings for today's headline. Only one is real.",
    meta: ['Bluff round', '~2 min'],
    anchor: true,
    played: false,
  },
  {
    num: 'N° 02',
    section: 'The Number Hunt',
    title: 'The Spread',
    tagline: 'Guess the number behind a real news story. The closer you are, the more points you score.',
    meta: ['Numerical', '~2 min'],
    played: true,
    points: 84,
  },
  {
    num: 'N° 03',
    section: 'Two Truths, One Lie',
    title: 'Science or Fiction',
    tagline: 'Three claims. Two are real and cited. One is fabricated. Find the fake.',
    meta: ['Cited sources', '~3 min'],
    played: false,
  },
];

function CurMasthead() {
  return (
    <div style={{ paddingTop: 2, marginBottom: 28 }}>
      <div style={{ height: 2, background: C_CUR.rule, marginBottom: 2 }} />
      <div style={{ height: 2, background: C_CUR.rule, marginBottom: 2 }} />
      <div style={{ padding: '18px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: F_CUR.mono, fontSize: 9, letterSpacing: '0.18em', color: C_CUR.muted, textTransform: 'uppercase', marginBottom: 6 }}>
          No. 0142 · Tuesday, May 5
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>
          <span style={{ fontFamily: F_CUR.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 38, color: C_CUR.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>Noodle </span>
          <span style={{ fontFamily: F_CUR.serif, fontStyle: 'italic', fontWeight: 400, fontSize: 38, color: C_CUR.accent, letterSpacing: '-0.02em', lineHeight: 1 }}>Bowl</span>
        </div>
        <div style={{ fontFamily: F_CUR.mono, fontSize: 9, letterSpacing: '0.12em', color: C_CUR.muted, textTransform: 'uppercase', marginTop: 8 }}>A Daily Mix Of Brain Games</div>
        <div style={{ fontFamily: F_CUR.mono, fontWeight: 700, fontSize: 11, color: C_CUR.ink, marginTop: 10 }}>🔥 5  🛡 2</div>
      </div>
      <div style={{ height: 2, background: C_CUR.rule, marginBottom: 2 }} />
      <div style={{ height: 2, background: C_CUR.rule }} />
    </div>
  );
}

function StatsCard() {
  return (
    <div style={{
      border: `1px solid ${C_CUR.rule}`, background: C_CUR.paperDark,
      padding: 18, marginBottom: 24, position: 'relative',
      boxShadow: `3px 3px 0 ${C_CUR.rule}`,
    }}>
      <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(42,53,72,0.15)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[
          ['218', 'Points'],
          ['🔥 5', 'Day Streak'],
          ['3', 'Assists'],
        ].map(([v, l], i, arr) => (
          <React.Fragment key={i}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: F_CUR.serif, fontWeight: 800, fontSize: 22, color: C_CUR.ink, lineHeight: 1.2 }}>{v}</div>
              <div style={{ fontFamily: F_CUR.mono, fontSize: 8, letterSpacing: '0.18em', color: C_CUR.muted, textTransform: 'uppercase', marginTop: 2 }}>{l}</div>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, height: 28, background: C_CUR.paperDarker }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontFamily: F_CUR.mono, fontSize: 9, letterSpacing: '0.18em', color: C_CUR.muted, textTransform: 'uppercase', marginRight: 10 }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: C_CUR.paperDarker }} />
    </div>
  );
}

function GameCard({ game }) {
  const playedToday = game.played;
  return (
    <div style={{
      border: `1px solid ${game.anchor ? C_CUR.gold : C_CUR.rule}`,
      background: C_CUR.paper, marginBottom: 16, position: 'relative',
      boxShadow: `3px 3px 0 ${C_CUR.rule}`,
      opacity: playedToday ? 0.85 : 1,
    }}>
      {/* header */}
      <div style={{ background: C_CUR.ink, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: F_CUR.mono, fontSize: 8, letterSpacing: '0.14em', color: game.anchor ? C_CUR.gold : C_CUR.onDarkDim, textTransform: 'uppercase' }}>{game.num}</span>
          <span style={{ fontFamily: F_CUR.mono, fontSize: 8, letterSpacing: '0.14em', color: C_CUR.onDark, textTransform: 'uppercase' }}>{game.section}</span>
        </div>
        {playedToday ? (
          <div style={{ border: `1px solid ${C_CUR.green}`, padding: '2px 6px' }}>
            <span style={{ fontFamily: F_CUR.mono, fontWeight: 700, fontSize: 8, letterSpacing: '0.14em', color: C_CUR.green, textTransform: 'uppercase' }}>Played ✓</span>
          </div>
        ) : (
          <div style={{ border: `1px solid ${C_CUR.onDarkDim}`, padding: '2px 6px' }}>
            <span style={{ fontFamily: F_CUR.mono, fontWeight: 700, fontSize: 8, letterSpacing: '0.14em', color: C_CUR.onDark, textTransform: 'uppercase' }}>Play →</span>
          </div>
        )}
      </div>
      {/* body */}
      <div style={{ padding: 18, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(42,53,72,0.15)', pointerEvents: 'none' }} />
        <div style={{ fontFamily: F_CUR.serif, fontWeight: 800, fontStyle: 'italic', fontSize: 22, color: C_CUR.ink, lineHeight: 1.1, marginBottom: 6 }}>{game.title}</div>
        <div style={{ fontFamily: F_CUR.serif, fontSize: 12, color: C_CUR.muted, lineHeight: 1.4, marginBottom: 10 }}>{game.tagline}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
          {game.meta.map((m, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ fontFamily: F_CUR.mono, fontSize: 8, color: C_CUR.muted, margin: '0 4px' }}>·</span>}
              <span style={{ fontFamily: F_CUR.mono, fontSize: 8, letterSpacing: '0.14em', color: C_CUR.muted, textTransform: 'uppercase' }}>{m}</span>
            </React.Fragment>
          ))}
          {playedToday && game.points && (
            <>
              <span style={{ fontFamily: F_CUR.mono, fontSize: 8, color: C_CUR.muted, margin: '0 4px' }}>·</span>
              <span style={{ background: C_CUR.green, padding: '1px 4px', fontFamily: F_CUR.mono, fontWeight: 700, fontSize: 8, color: C_CUR.onDark, letterSpacing: '0.12em' }}>+{game.points} PTS</span>
              <span style={{ fontFamily: F_CUR.mono, fontSize: 8, color: C_CUR.muted, margin: '0 4px' }}>·</span>
              <span style={{ fontFamily: F_CUR.mono, fontSize: 8, letterSpacing: '0.14em', color: C_CUR.muted, textTransform: 'uppercase' }}>Play Again</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentHome() {
  return (
    <div style={{ width: '100%', height: '100%', background: C_CUR.paper, padding: '36px 14px 14px', boxSizing: 'border-box', overflowY: 'auto' }}>
      <CurMasthead />
      <StatsCard />
      <SectionHeader>Today's Games</SectionHeader>
      {CURRENT_GAMES.map((g, i) => <GameCard key={i} game={g} />)}
    </div>
  );
}

window.CurrentHome = CurrentHome;
