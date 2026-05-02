// games-proposals.jsx — alternative play-screen proposals for each game

const PC = {
  ink: '#1a2030', paper: '#e8eef3', paperDark: '#d8e1ea', paperDarker: '#c4d0dc',
  rule: '#2a3548', accent: '#b84a35', gold: '#b8902c', green: '#4a7a3e', muted: '#5a6878',
  onDark: '#e8eef3', onDarkDim: '#b8c4d4',
};
const PSR = 'Fraunces, Georgia, serif';
const PMN = '"JetBrains Mono", ui-monospace, Menlo, monospace';

// shared compact masthead (smaller than current — recovers vertical space)
function CompactMast({ kicker = 'No. 0142 · Tue May 5' }) {
  return (
    <div style={{ borderBottom: `1.5px solid ${PC.rule}`, paddingBottom: 6, marginBottom: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 16, color: PC.ink, lineHeight: 1 }}>
        Noodle<span style={{ color: PC.accent, fontWeight: 400 }}>·</span>Bowl
      </div>
      <div style={{ fontFamily: PMN, fontSize: 7.5, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase' }}>{kicker}</div>
    </div>
  );
}

// ================================================================
// LEDE — Proposal A · Newsroom Pitch
// reporters as a vertical "wire feed" with one expanded at a time
// ================================================================
function LedeA() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 4 }}>The Lede · 1 of 3</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 700, fontSize: 17, color: PC.ink, lineHeight: 1.2, marginBottom: 4 }}>
        EU regulator orders banks to stop running their own AI models, citing<span style={{ color: PC.accent }}>___</span>
      </div>
      <div style={{ fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.12em', marginBottom: 14 }}>REUTERS · THIS WEEK</div>

      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>Wire feed</span><span>3 reporters</span>
      </div>

      {[
        { name: 'Maya Chen', role: 'REUTERS', text: 'concerns over hallucinated risk advice', open: true, sel: true },
        { name: 'Tom Park', role: 'BLOOMBERG', text: 'rising costs of GPU procurement contracts', open: false },
        { name: 'Asha Patel', role: 'FINANCIAL TIMES', text: 'a pending civil suit from a hedge fund', open: false },
      ].map((p, i) => (
        <div key={i} style={{ borderTop: `1px solid ${PC.rule}`, padding: '10px 0', display: 'flex', gap: 10 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: `1.5px solid ${PC.ink}`,
            background: p.sel ? PC.ink : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
          }}>
            {p.sel && <div style={{ width: 6, height: 6, background: PC.accent, borderRadius: '50%' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: PSR, fontWeight: 700, fontSize: 12, color: PC.ink }}>{p.name}</span>
              <span style={{ fontFamily: PMN, fontSize: 7.5, color: PC.muted, letterSpacing: '0.14em' }}>{p.role}</span>
            </div>
            <div style={{ fontFamily: PSR, fontStyle: 'italic', fontSize: 13, color: PC.ink, lineHeight: 1.3 }}>"…{p.text}."</div>
            {p.open && (
              <div style={{ marginTop: 8, padding: 10, background: PC.paperDark, fontFamily: PSR, fontSize: 11, fontStyle: 'italic', color: PC.muted, lineHeight: 1.4 }}>
                Pitch: I covered this Tuesday. ECB sent banks a memo flagging hallucinated outputs in client risk reports.
              </div>
            )}
          </div>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${PC.rule}`, marginTop: 4 }} />

      <div style={{ marginTop: 14, background: PC.ink, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Run Maya's Story →</span>
      </div>
      <div style={{ marginTop: 8, textAlign: 'center', fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.14em' }}>STUCK? PHONE A FRIEND</div>
    </div>
  );
}

// ================================================================
// LEDE — Proposal B · Headline-First Tap
// horizontal cards in a tight stack; minimal chrome
// ================================================================
function LedeB() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>FINISH THE HEADLINE</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 19, color: PC.ink, lineHeight: 1.2, marginBottom: 6 }}>
        EU regulator orders banks to stop running their own AI models, citing
      </div>
      <div style={{ display: 'inline-block', background: PC.gold, color: PC.ink, padding: '2px 8px', fontFamily: PMN, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
        ? · pick an ending
      </div>

      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginBottom: 8 }}>Tap to choose</div>
      {[
        { text: 'concerns over hallucinated risk advice', sel: false },
        { text: 'rising GPU procurement costs', sel: true },
        { text: 'a pending civil suit from a hedge fund', sel: false },
      ].map((o, i) => (
        <div key={i} style={{
          padding: '12px 12px 12px 14px', marginBottom: 8,
          background: o.sel ? PC.ink : PC.paper,
          borderLeft: `4px solid ${o.sel ? PC.accent : PC.paperDarker}`,
          boxShadow: o.sel ? 'none' : `2px 2px 0 ${PC.paperDarker}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ fontFamily: PSR, fontStyle: 'italic', fontSize: 13, color: o.sel ? PC.onDark : PC.ink, lineHeight: 1.3 }}>{o.text}</div>
          <div style={{ fontFamily: PMN, fontSize: 8, color: o.sel ? PC.onDarkDim : PC.muted, letterSpacing: '0.14em' }}>{['A','B','C'][i]}</div>
        </div>
      ))}

      <div style={{ marginTop: 14, padding: 10, background: PC.paperDark, fontFamily: PSR, fontSize: 11, fontStyle: 'italic', color: PC.muted, lineHeight: 1.4, borderLeft: `2px solid ${PC.paperDarker}` }}>
        <span style={{ fontFamily: PMN, fontStyle: 'normal', fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase' }}>Pitch from B · </span>
        Tom: ECB cited GPU contract costs eating into capital ratios.
      </div>

      <div style={{ marginTop: 14, background: PC.ink, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Lock In B</span>
      </div>
    </div>
  );
}

// ================================================================
// SPREAD — Proposal A · Number Line
// Range slider w/ live anchor markers (typical / extreme)
// ================================================================
function SpreadA() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>The Spread</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: PC.ink, lineHeight: 1.25, marginBottom: 18 }}>
        How many one-euro houses did the Sicilian town of Sambuca sell in 2019?
      </div>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: PSR, fontWeight: 800, fontSize: 44, color: PC.ink, lineHeight: 1 }}>16</span>
        <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginTop: 2 }}>HOUSES · YOUR GUESS</div>
      </div>

      {/* number line */}
      <div style={{ position: 'relative', marginTop: 26, marginBottom: 6, height: 56 }}>
        <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 2, background: PC.ink }} />
        {/* ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <div key={i} style={{ position: 'absolute', top: 24, left: `${t*100}%`, width: 1, height: 10, background: PC.ink, transform: 'translateX(-50%)' }} />
        ))}
        {/* anchors */}
        <div style={{ position: 'absolute', top: 0, left: '15%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: PMN, fontSize: 7, color: PC.muted, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>typical small town</div>
          <div style={{ width: 1, height: 8, background: PC.muted, margin: '2px auto 0' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: '70%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontFamily: PMN, fontSize: 7, color: PC.muted, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>1k pop. equiv.</div>
          <div style={{ width: 1, height: 8, background: PC.muted, margin: '2px auto 0' }} />
        </div>
        {/* user dot */}
        <div style={{ position: 'absolute', top: 22, left: '8%', transform: 'translateX(-50%)' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: PC.accent, border: `2px solid ${PC.ink}` }} />
        </div>
        {/* range */}
        <div style={{ position: 'absolute', top: 38, left: 0, fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.12em' }}>1</div>
        <div style={{ position: 'absolute', top: 38, right: 0, fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.12em' }}>500</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 18, marginBottom: 14 }}>
        {['−10', '−1', '+1', '+10'].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '10px 0', textAlign: 'center', border: `1.5px solid ${PC.ink}`, background: PC.paper }}>
            <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 11, color: PC.ink, letterSpacing: '0.06em' }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ background: PC.ink, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Submit Guess</span>
      </div>
    </div>
  );
}

// ================================================================
// SPREAD — Proposal B · "Higher / Lower" Anchor
// Show an anchor number, ask "more or fewer than X?" then refine
// ================================================================
function SpreadB() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>The Spread · ROUND 2 of 2</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: PC.ink, lineHeight: 1.25, marginBottom: 14 }}>
        How many one-euro houses did Sambuca sell in 2019?
      </div>

      <div style={{ background: PC.paperDark, padding: 12, marginBottom: 14 }}>
        <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginBottom: 4 }}>You said</div>
        <div style={{ fontFamily: PSR, fontWeight: 700, fontSize: 18, color: PC.ink, marginBottom: 8 }}>more than 10 ✓</div>
        <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase' }}>Now narrow it down</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: PMN, fontSize: 9, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginBottom: 4 }}>Was it ≥</div>
        <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 56, color: PC.ink, lineHeight: 1 }}>15</div>
        <div style={{ fontFamily: PMN, fontSize: 9, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginTop: 2 }}>HOUSES?</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', border: `2px solid ${PC.ink}`, background: PC.paper }}>
          <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: PC.ink }}>Fewer</div>
          <div style={{ fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.12em', marginTop: 2 }}>&lt; 15</div>
        </div>
        <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', background: PC.ink }}>
          <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: PC.onDark }}>More</div>
          <div style={{ fontFamily: PMN, fontSize: 8, color: PC.onDarkDim, letterSpacing: '0.12em', marginTop: 2 }}>≥ 15</div>
        </div>
      </div>

      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontSize: 11, color: PC.muted, lineHeight: 1.4 }}>
        Each correct narrowing earns points. Your range tightens until you commit.
      </div>
    </div>
  );
}

// ================================================================
// SPREAD — Proposal C · Distribution Reveal (think "Family Feud")
// Pre-input: shows a faint range histogram of "what others guessed"
// ================================================================
function SpreadC() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>The Spread</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: PC.ink, lineHeight: 1.25, marginBottom: 14 }}>
        How many one-euro houses did Sambuca sell in 2019?
      </div>

      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>What 2,847 readers guessed</div>
      {/* histogram */}
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 72, gap: 2, marginBottom: 4, borderBottom: `1px solid ${PC.ink}` }}>
        {[8, 14, 22, 38, 54, 60, 48, 34, 26, 18, 12, 8, 6, 4, 3].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? PC.accent : PC.paperDarker, position: 'relative' }}>
            {i === 5 && (
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontFamily: PMN, fontSize: 7, color: PC.accent, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>YOU · 16</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: PMN, fontSize: 7.5, color: PC.muted, letterSpacing: '0.1em', marginBottom: 16 }}>
        <span>1</span><span>50</span><span>250</span><span>500+</span>
      </div>

      <div style={{ background: PC.paperDark, padding: '10px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.14em', color: PC.muted, textTransform: 'uppercase' }}>Your guess</div>
          <div style={{ fontFamily: PSR, fontWeight: 800, fontSize: 22, color: PC.ink }}>16 houses</div>
        </div>
        <div style={{ fontFamily: PMN, fontSize: 8, color: PC.muted, letterSpacing: '0.14em' }}>EDIT</div>
      </div>

      <div style={{ background: PC.ink, padding: '12px 0', textAlign: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Lock In · Reveal Answer</span>
      </div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontSize: 11, color: PC.muted, textAlign: 'center', lineHeight: 1.4, marginTop: 6 }}>
        Bonus points for being closer than the crowd's median.
      </div>
    </div>
  );
}

// ================================================================
// SOF — Proposal A · Pick The Liar (one tap)
// inverts: instead of voting on each, just pick the fake
// ================================================================
function SofA() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>Science or Fiction · Octopus Cognition</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: PC.ink, lineHeight: 1.25, marginBottom: 4 }}>
        Two of these are real. One is a lie.
      </div>
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 14 }}>TAP THE FAKE</div>

      {[
        { n: 1, text: 'Octopuses have neurons distributed across their arms and can solve puzzles independently with each one.', sel: false },
        { n: 2, text: 'Common octopuses can identify and remember individual humans by scent through their suckers.', sel: true },
        { n: 3, text: 'Cephalopods edit their RNA to adapt to cold water — humans don\u2019t.', sel: false },
      ].map((c, i) => (
        <div key={i} style={{
          padding: 12, marginBottom: 10,
          background: c.sel ? PC.accent : PC.paper,
          border: `1.5px solid ${c.sel ? PC.accent : PC.ink}`,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: c.sel ? PC.onDark : PC.muted, textTransform: 'uppercase' }}>Claim {c.n}</span>
            {c.sel && <span style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 12, color: PC.onDark }}>← my pick</span>}
          </div>
          <div style={{ fontFamily: PSR, fontSize: 13, color: c.sel ? PC.onDark : PC.ink, lineHeight: 1.4 }}>{c.text}</div>
        </div>
      ))}

      <div style={{ marginTop: 6, background: PC.ink, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Lock In Claim 2 →</span>
      </div>
      <div style={{ marginTop: 8, fontFamily: PSR, fontStyle: 'italic', fontSize: 10, color: PC.muted, textAlign: 'center' }}>
        Confidence wager: bet 1× or 2× points on this pick.
      </div>
    </div>
  );
}

// ================================================================
// SOF — Proposal B · Confidence Sliders
// each claim gets a left/right confidence slider; spectrum rather than binary
// ================================================================
function SofB() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6 }}>Science or Fiction</div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: PC.ink, lineHeight: 1.2, marginBottom: 2 }}>Octopus Cognition</div>
      <div style={{ fontFamily: PSR, fontSize: 11, color: PC.muted, lineHeight: 1.4, marginBottom: 16 }}>Three claims. Slide each toward what you believe.</div>

      {[
        { text: 'Neurons distributed across arms; each can solve puzzles independently.', pos: 0.78 },
        { text: 'Common octopuses identify humans by scent through their suckers.', pos: 0.18 },
        { text: 'Cephalopods edit their RNA to adapt to cold water.', pos: 0.5 },
      ].map((c, i) => (
        <div key={i} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${PC.paperDarker}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: PC.accent, lineHeight: 1 }}>{i + 1}</span>
            <div style={{ fontFamily: PSR, fontSize: 12, color: PC.ink, lineHeight: 1.35 }}>{c.text}</div>
          </div>
          {/* slider */}
          <div style={{ position: 'relative', height: 30 }}>
            <div style={{ position: 'absolute', top: 14, left: 0, right: 0, height: 2, background: PC.ink }} />
            <div style={{ position: 'absolute', top: 11, left: 0, fontFamily: PMN, fontSize: 7.5, color: PC.muted, letterSpacing: '0.14em', textTransform: 'uppercase', transform: 'translateY(8px)' }}>FICTION</div>
            <div style={{ position: 'absolute', top: 11, right: 0, fontFamily: PMN, fontSize: 7.5, color: PC.muted, letterSpacing: '0.14em', textTransform: 'uppercase', transform: 'translateY(8px)' }}>SCIENCE</div>
            <div style={{ position: 'absolute', top: 8, left: `${c.pos*100}%`, transform: 'translateX(-50%)' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: PC.paper, border: `2px solid ${PC.ink}` }} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 4, background: PC.ink, padding: '12px 0', textAlign: 'center' }}>
        <span style={{ fontFamily: PMN, fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', color: PC.onDark, textTransform: 'uppercase' }}>Lock In</span>
      </div>
      <div style={{ marginTop: 6, fontFamily: PSR, fontStyle: 'italic', fontSize: 10, color: PC.muted, textAlign: 'center' }}>
        More confident = more points if right, more lost if wrong.
      </div>
    </div>
  );
}

// ================================================================
// SOF — Proposal C · One Claim At A Time (carousel)
// less wall of text; better focus
// ================================================================
function SofC() {
  return (
    <div style={{ width: '100%', height: '100%', background: PC.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: PSR }}>
      <CompactMast />
      <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.18em', color: PC.muted, textTransform: 'uppercase', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>Science or Fiction</span><span>Claim 2 / 3</span>
      </div>
      <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 14, color: PC.ink, marginBottom: 12 }}>Topic: Octopus Cognition</div>

      {/* progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        <div style={{ flex: 1, height: 4, background: PC.green }} />
        <div style={{ flex: 1, height: 4, background: PC.ink }} />
        <div style={{ flex: 1, height: 4, background: PC.paperDarker }} />
      </div>

      <div style={{ background: PC.paper, border: `1.5px solid ${PC.ink}`, padding: 16, marginBottom: 16, boxShadow: `4px 4px 0 ${PC.rule}` }}>
        <div style={{ fontFamily: PMN, fontSize: 8, letterSpacing: '0.16em', color: PC.muted, textTransform: 'uppercase', marginBottom: 8 }}>Claim 02</div>
        <div style={{ fontFamily: PSR, fontSize: 16, color: PC.ink, lineHeight: 1.4 }}>
          Common octopuses can identify and remember individual humans by scent through their suckers.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: '18px 0', textAlign: 'center', background: PC.green }}>
          <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: PC.onDark, lineHeight: 1 }}>Science</div>
          <div style={{ fontFamily: PMN, fontSize: 8, color: PC.onDarkDim, letterSpacing: '0.16em', marginTop: 4, textTransform: 'uppercase' }}>Real</div>
        </div>
        <div style={{ flex: 1, padding: '18px 0', textAlign: 'center', background: PC.accent }}>
          <div style={{ fontFamily: PSR, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: PC.onDark, lineHeight: 1 }}>Fiction</div>
          <div style={{ fontFamily: PMN, fontSize: 8, color: PC.onDarkDim, letterSpacing: '0.16em', marginTop: 4, textTransform: 'uppercase' }}>Made up</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: PMN, fontSize: 9, color: PC.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        <span>← Claim 1</span>
        <span>Skip</span>
        <span style={{ color: PC.paperDarker }}>Claim 3 →</span>
      </div>
    </div>
  );
}

Object.assign(window, { LedeA, LedeB, SpreadA, SpreadB, SpreadC, SofA, SofB, SofC });
