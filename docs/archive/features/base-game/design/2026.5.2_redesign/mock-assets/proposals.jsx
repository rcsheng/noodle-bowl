// proposals.jsx — five alternative home-screen game-list designs.
// Each addresses specific issues in the current design (see critique notes).

const P = {
  paper: '#e8eef3',
  ink: '#1a2030',
  muted: '#5a6878',
  accent: '#b84a35',
  gold: '#b8902c',
  green: '#4a7a3e',
  rule: '#2a3548',
};

const SERIF = 'Fraunces, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

const GAMES = [
  { id: 'lede', num: '01', section: 'Finish The Headline', title: 'The Lede', tagline: 'Three reporters offer competing endings. Only one is real.', meta: ['Bluff', '~2 min'], played: false },
  { id: 'spread', num: '02', section: 'The Number Hunt', title: 'The Spread', tagline: 'Guess the number behind a real news story.', meta: ['Numerical', '~2 min'], played: true, points: 84, accuracy: 'Within 8%' },
  { id: 'sof', num: '03', section: 'Two Truths, One Lie', title: 'Science or Fiction', tagline: 'Three claims. Two real, one fake. Find it.', meta: ['Cited', '~3 min'], played: false },
];

// ────────── PROPOSAL A · Compact Index ──────────
// Fixes: cards eat too much screen → only 1.2 fit at a time. Convert to a
// dense newspaper-style index. Headline-first, tagline collapsed, status as
// gutter glyph. User can see all 3 games + "what's next" without scrolling.
function ProposalA() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#f6f3ec', padding: '40px 18px 14px', boxSizing: 'border-box', fontFamily: SERIF }}>
      {/* compact masthead */}
      <div style={{ borderTop: `1.5px solid ${P.ink}`, borderBottom: `1.5px solid ${P.ink}`, padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: P.ink, letterSpacing: '-0.02em' }}>
          Noodle <span style={{ color: P.accent, fontWeight: 400 }}>Bowl</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.15em' }}>TUE · MAY 5</div>
      </div>

      {/* personal strip — single line, no chrome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid rgba(26,32,48,.12)` }}>
        <div><span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: P.ink }}>218</span> <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em' }}>PTS</span></div>
        <div><span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: P.ink }}>5</span> <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em' }}>STREAK</span></div>
        <div><span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: P.ink }}>1/3</span> <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em' }}>DONE</span></div>
      </div>

      {/* Today header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: P.ink }}>Today's bowl</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.15em' }}>3 GAMES · ~7 MIN</div>
      </div>

      {/* progress bar — proper progress instead of ad-hoc badge */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {GAMES.map((g, i) => (
          <div key={i} style={{ flex: 1, height: 4, background: g.played ? P.green : 'rgba(26,32,48,.12)' }} />
        ))}
      </div>

      {/* dense list — all 3 visible */}
      {GAMES.map((g, i) => (
        <div key={g.id} style={{
          display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 10, alignItems: 'flex-start',
          padding: '14px 0', borderBottom: i < GAMES.length - 1 ? `1px solid rgba(26,32,48,.12)` : 'none',
        }}>
          {/* status gutter */}
          <div style={{ paddingTop: 4 }}>
            {g.played ? (
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: P.green, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>✓</div>
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 9, color: P.muted, letterSpacing: '0.1em' }}>{g.num}</div>
            )}
          </div>

          {/* title + meta */}
          <div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: P.ink, lineHeight: 1.15 }}>{g.title}</div>
            <div style={{ fontFamily: SERIF, fontSize: 11, color: P.muted, marginTop: 2, lineHeight: 1.35 }}>{g.tagline}</div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em', marginTop: 5, textTransform: 'uppercase' }}>
              {g.played ? `${g.accuracy} · +${g.points} pts` : `${g.meta.join(' · ')}`}
            </div>
          </div>

          {/* CTA — text only, ink color */}
          <div style={{ paddingTop: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: g.played ? P.muted : P.ink }}>
              {g.played ? 'AGAIN' : 'PLAY →'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────── PROPOSAL B · Single Anchor + Up Next ──────────
// Fixes: every card screams equally → no clear next action. The "anchor" gold
// border is too subtle. Promote ONE up-next card; demote others to a quiet list.
function ProposalB() {
  const next = GAMES.find(g => !g.played);
  const others = GAMES.filter(g => g !== next);
  return (
    <div style={{ width: '100%', height: '100%', background: P.paper, padding: '40px 16px 14px', boxSizing: 'border-box' }}>
      {/* lean masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 24, color: P.ink, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Noodle<span style={{ color: P.accent, fontWeight: 400 }}> Bowl</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.15em', marginTop: 4 }}>TUE · MAY 5 · NO. 142</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16, color: P.ink }}>🔥 5</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em' }}>STREAK</div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(26,32,48,.18)', marginBottom: 18 }} />

      {/* Up next — the hero */}
      <div style={{ fontFamily: MONO, fontSize: 9, color: P.muted, letterSpacing: '0.18em', marginBottom: 8 }}>UP NEXT · 1 OF 2 LEFT</div>
      <div style={{ background: P.ink, padding: 18, color: 'white', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: P.gold, letterSpacing: '0.18em' }}>N° {next.num} · {next.section.toUpperCase()}</div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(232,238,243,.6)', letterSpacing: '0.12em' }}>~2 MIN</div>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 30, lineHeight: 1, marginBottom: 8 }}>{next.title}</div>
        <div style={{ fontFamily: SERIF, fontSize: 13, color: 'rgba(232,238,243,.8)', lineHeight: 1.4, marginBottom: 16 }}>{next.tagline}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 8, color: 'rgba(232,238,243,.5)', letterSpacing: '0.12em' }}>BLUFF ROUND</div>
          <div style={{ background: P.gold, padding: '8px 16px', fontFamily: MONO, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: P.ink }}>START →</div>
        </div>
      </div>

      {/* Quiet rest */}
      <div style={{ fontFamily: MONO, fontSize: 9, color: P.muted, letterSpacing: '0.18em', marginTop: 22, marginBottom: 10 }}>ALSO TODAY</div>
      {others.map(g => (
        <div key={g.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderTop: '1px solid rgba(26,32,48,.12)',
        }}>
          <div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em' }}>N°{g.num}</span>
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: g.played ? P.muted : P.ink }}>{g.title}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: g.played ? P.green : P.muted, letterSpacing: '0.12em', marginTop: 2 }}>
              {g.played ? `✓ DONE · ${g.accuracy.toUpperCase()} · +${g.points}` : g.meta.join(' · ').toUpperCase()}
            </div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: g.played ? P.muted : P.ink, letterSpacing: '0.12em' }}>
            {g.played ? 'REPLAY' : 'PLAY →'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ────────── PROPOSAL C · Menu / Course Card ──────────
// Plays into the "noodle" metaphor honestly. Treats the day's games as a
// tasting menu (course 1, 2, 3). Each course is stacked as a vertical column
// — visual rhythm, easy thumb scan. Status = stamped.
function ProposalC() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fefcf6', padding: '40px 16px 14px', boxSizing: 'border-box' }}>
      {/* tiny masthead */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.25em', color: P.accent, fontWeight: 700 }}>TODAY'S TASTING MENU</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 28, color: P.ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 6 }}>Tuesday, May 5</div>
        <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: P.muted, marginTop: 4 }}>3 COURSES · ~7 MINUTES</div>
      </div>

      {/* status pill row */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22 }}>
        {GAMES.map((g, i) => (
          <div key={i} style={{
            flex: 1, padding: '4px 0', textAlign: 'center',
            background: g.played ? P.ink : 'transparent',
            border: `1px solid ${P.ink}`,
            color: g.played ? '#fefcf6' : P.ink,
            fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.18em',
          }}>{g.played ? '✓' : `0${i + 1}`}</div>
        ))}
      </div>

      {/* courses */}
      {GAMES.map((g, i) => (
        <div key={g.id} style={{
          marginBottom: 14, position: 'relative',
          padding: '14px 0', borderTop: `1px solid ${P.ink}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: g.played ? P.muted : P.accent }}>
              COURSE {i + 1}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.14em' }}>{g.meta[1].toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: g.played ? P.muted : P.ink, lineHeight: 1.1 }}>
              {g.title}
            </div>
            {g.played && (
              <div style={{
                border: `1.5px solid ${P.accent}`, color: P.accent,
                padding: '2px 6px', fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: '0.15em',
                transform: 'rotate(-4deg)',
              }}>+{g.points}</div>
            )}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 12, color: P.muted, lineHeight: 1.4, marginTop: 4 }}>{g.tagline}</div>
          {!g.played && (
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: P.ink }}>SERVE →</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ────────── PROPOSAL D · Carousel + Anchor ──────────
// Treats games as a swipeable deck so each card can BREATHE at full size.
// Solves: long taglines + meta + double-border chrome were cramped at 16:9.
// The home is a hero card with a sneak peek of the next.
function ProposalD() {
  return (
    <div style={{ width: '100%', height: '100%', background: P.paper, padding: '40px 16px 14px', boxSizing: 'border-box' }}>
      {/* slim masthead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 20, color: P.ink, letterSpacing: '-0.02em' }}>
          Noodle<span style={{ color: P.accent, fontWeight: 400 }}> Bowl</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: P.ink, fontWeight: 700 }}>🔥 5</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.15em', marginBottom: 16 }}>
        TUESDAY MAY 5 · 1 PLAYED · 2 LEFT
      </div>

      {/* hero card */}
      <div style={{ background: 'white', border: `1px solid ${P.ink}`, padding: '20px 16px', position: 'relative', boxShadow: `4px 4px 0 ${P.ink}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: P.accent, fontWeight: 700, letterSpacing: '0.18em' }}>N° 01 · LEDE</span>
          <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.14em' }}>~2 MIN</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 36, color: P.ink, lineHeight: 1, letterSpacing: '-0.02em', margin: '14px 0 8px' }}>
          Finish<br/>the headline.
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 13, color: P.muted, lineHeight: 1.5, marginBottom: 18 }}>
          Three reporters offer competing endings for today's lede. Only one is real.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.18em', color: P.muted }}>BLUFF ROUND</div>
          <div style={{ background: P.ink, color: 'white', padding: '10px 18px', fontFamily: MONO, fontWeight: 700, fontSize: 11, letterSpacing: '0.16em' }}>PLAY →</div>
        </div>
      </div>

      {/* peek of next card */}
      <div style={{ marginTop: 14, marginRight: -16, opacity: 0.55 }}>
        <div style={{ background: 'white', border: `1px solid ${P.ink}`, padding: '14px 14px', height: 70, overflow: 'hidden' }}>
          <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.18em' }}>N° 03 · TWO TRUTHS · ~3 MIN</span>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: P.ink, marginTop: 4 }}>Science or Fiction</div>
        </div>
      </div>

      {/* dots + swipe affordance */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 18, height: 4, background: P.ink }} />
        <div style={{ width: 4, height: 4, background: P.muted, opacity: 0.6, borderRadius: 4 }} />
        <div style={{ width: 4, height: 4, background: P.green, borderRadius: 4 }} />
        <span style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.18em', marginLeft: 8 }}>SWIPE →</span>
      </div>
    </div>
  );
}

// ────────── PROPOSAL E · Daily Brief ──────────
// Reframes home as the "daily brief" — gives ONE story-of-the-day excerpt
// (the source for today's questions), and the games hang off that. Solves
// the "abstract chrome / no real content shown" problem of the current home.
function ProposalE() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#f7f3ec', padding: '40px 16px 14px', boxSizing: 'border-box' }}>
      <div style={{ borderTop: `2px solid ${P.ink}`, paddingTop: 8, marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: P.ink, letterSpacing: '-0.02em' }}>
            Noodle <span style={{ color: P.accent, fontWeight: 400 }}>Bowl</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.16em' }}>TUE · MAY 5</div>
        </div>
      </div>
      <div style={{ height: 1, background: P.ink, marginBottom: 16 }} />

      {/* Today's brief */}
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: P.accent, letterSpacing: '0.22em', marginBottom: 6 }}>TODAY'S BRIEF</div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: P.ink, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
        The week the EU told banks to stop running their own AI models—
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 11, color: P.muted, lineHeight: 1.5, marginTop: 6 }}>
        ...plus three smaller stories you'll meet in today's questions. <span style={{ color: P.ink, textDecoration: 'underline' }}>read recap →</span>
      </div>

      <div style={{ height: 1, background: 'rgba(26,32,48,.2)', margin: '18px 0 14px' }} />

      {/* games as a TOC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: P.muted, letterSpacing: '0.22em' }}>IN THIS ISSUE</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.14em' }}>1 / 3 PLAYED</div>
      </div>

      {GAMES.map((g, i) => (
        <div key={g.id} style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '10px 0',
          borderBottom: i < GAMES.length - 1 ? '1px dashed rgba(26,32,48,.2)' : 'none',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: g.played ? P.green : P.ink, letterSpacing: '0.1em', minWidth: 18 }}>
            {g.played ? '✓' : `${g.num}`}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: g.played ? P.muted : P.ink, lineHeight: 1.15 }}>
              {g.title}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.12em', marginTop: 2 }}>
              {g.played ? `${g.accuracy.toUpperCase()} · +${g.points} PTS` : g.section.toUpperCase()}
            </div>
          </div>
          {/* leader dots — true magazine TOC */}
          <div style={{
            flex: '0 1 30px', borderBottom: '1px dotted rgba(26,32,48,.4)', marginBottom: 4, alignSelf: 'flex-end',
          }} />
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: g.played ? P.muted : P.ink, letterSpacing: '0.14em', alignSelf: 'flex-end', paddingBottom: 2 }}>
            {g.played ? 'AGAIN' : 'PLAY'}
          </span>
        </div>
      ))}

      {/* quiet stats footer */}
      <div style={{ marginTop: 22, paddingTop: 10, borderTop: `1px solid ${P.ink}`, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.14em' }}>SEASON · 218 PTS</div>
        <div style={{ fontFamily: MONO, fontSize: 8, color: P.muted, letterSpacing: '0.14em' }}>🔥 5 · 🛡 2 · ASSISTS 3</div>
      </div>
    </div>
  );
}

Object.assign(window, { ProposalA, ProposalB, ProposalC, ProposalD, ProposalE });
