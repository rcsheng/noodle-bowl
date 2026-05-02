// games-current.jsx — recreations of Lede, Spread, SoF play screens

const C = {
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
const SR = 'Fraunces, Georgia, serif';
const MN = '"JetBrains Mono", ui-monospace, Menlo, monospace';

function MiniMast() {
  return (
    <div style={{ paddingTop: 4, marginBottom: 14 }}>
      <div style={{ height: 1.5, background: C.rule, marginBottom: 1.5 }} />
      <div style={{ height: 1.5, background: C.rule, marginBottom: 1.5 }} />
      <div style={{ padding: '10px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.18em', color: C.muted, textTransform: 'uppercase' }}>No. 0142 · Tue May 5</div>
        <div style={{ fontFamily: SR, fontStyle: 'italic', fontWeight: 800, fontSize: 24, color: C.ink, lineHeight: 1.1, marginTop: 4 }}>
          Noodle <span style={{ color: C.accent, fontWeight: 400 }}>Bowl</span>
        </div>
      </div>
      <div style={{ height: 1.5, background: C.rule, marginBottom: 1.5 }} />
      <div style={{ height: 1.5, background: C.rule }} />
    </div>
  );
}

function Inset({ children, bg = C.paper, padding = 14 }) {
  return (
    <div style={{ border: `1px solid ${C.rule}`, background: bg, padding, position: 'relative', boxShadow: `3px 3px 0 ${C.rule}`, marginBottom: 12 }}>
      <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(42,53,72,0.15)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function LabelRow({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase', marginRight: 8 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.paperDarker }} />
    </div>
  );
}

function PrimaryBtn({ children }) {
  return (
    <div style={{ background: C.ink, padding: '12px 0', textAlign: 'center', marginBottom: 8 }}>
      <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 10, letterSpacing: '0.16em', color: C.onDark, textTransform: 'uppercase' }}>{children}</span>
    </div>
  );
}

function SecondaryBtn({ children }) {
  return (
    <div style={{ background: C.paper, border: `2px solid ${C.ink}`, padding: '10px 0', textAlign: 'center', marginBottom: 8 }}>
      <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 10, letterSpacing: '0.16em', color: C.ink, textTransform: 'uppercase' }}>{children}</span>
    </div>
  );
}

// ─── LEDE — current play ───
function LedePlayCurrent() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: SR }}>
      <MiniMast />
      <div style={{ fontFamily: MN, fontSize: 8, color: C.muted, letterSpacing: '0.14em', marginBottom: 6 }}>← BACK TO HOME</div>
      <LabelRow label="The Lede" />
      <Inset>
        <div style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Complete the headline</div>
        <div style={{ fontFamily: SR, fontStyle: 'italic', fontWeight: 700, fontSize: 16, color: C.ink, lineHeight: 1.25 }}>
          EU regulator orders banks to stop running their own AI models, citing<span style={{ color: C.muted }}> ___</span>
        </div>
        <div style={{ marginTop: 8, fontFamily: SR, fontSize: 10, fontStyle: 'italic', color: C.muted }}>Source hint: Reuters, this week</div>
      </Inset>
      <div style={{ fontFamily: SR, fontStyle: 'italic', fontSize: 11, color: C.muted, marginBottom: 10 }}>Select the reporter whose ending is real.</div>

      {[
        { name: 'Maya Chen', role: 'Reuters', text: 'concerns over hallucinated risk advice', selected: true },
        { name: 'Tom Park', role: 'Bloomberg', text: 'rising costs of GPU procurement contracts' },
        { name: 'Asha Patel', role: 'FT', text: 'a pending civil suit from a hedge fund' },
      ].map((p, i) => (
        <div key={i} style={{
          border: `1px solid ${C.rule}`, marginBottom: 10, position: 'relative',
          boxShadow: `3px 3px 0 ${C.rule}`,
          background: p.selected ? C.ink : C.paper,
        }}>
          <div style={{ background: p.selected ? C.accent : C.ink, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: SR, fontWeight: 700, fontSize: 12, color: C.onDark }}>{p.name}</span>
            <span style={{ fontFamily: MN, fontSize: 8, color: C.onDarkDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{p.role}</span>
          </div>
          <div style={{ padding: 10 }}>
            <div style={{ fontFamily: SR, fontStyle: 'italic', fontSize: 12, color: p.selected ? C.onDark : C.ink, lineHeight: 1.3, marginBottom: 6 }}>{p.text}</div>
            <div style={{ borderLeft: `2px solid ${C.paperDarker}`, paddingLeft: 8, fontFamily: SR, fontSize: 10, fontStyle: 'italic', color: p.selected ? C.onDarkDim : C.muted, lineHeight: 1.4 }}>
              "I covered this story Tuesday. The pitch turned on a memo from the ECB."
            </div>
          </div>
        </div>
      ))}
      <PrimaryBtn>Lock In</PrimaryBtn>
      <SecondaryBtn>Stuck? Ask a Friend</SecondaryBtn>
    </div>
  );
}

// ─── SPREAD — current play ───
function SpreadPlayCurrent() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: SR }}>
      <MiniMast />
      <div style={{ fontFamily: MN, fontSize: 8, color: C.muted, letterSpacing: '0.14em', marginBottom: 6 }}>← BACK TO HOME</div>
      <LabelRow label="The Spread" />
      <Inset>
        <div style={{ fontFamily: SR, fontStyle: 'italic', fontWeight: 700, fontSize: 15, color: C.ink, lineHeight: 1.3 }}>
          How many one-euro houses did the Sicilian town of Sambuca sell in 2019?
        </div>
      </Inset>
      <Inset>
        <div style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Your Answer</div>
        <div style={{ fontFamily: SR, fontWeight: 700, fontSize: 26, color: C.ink, borderBottom: `2px solid ${C.ink}`, paddingBottom: 4, marginBottom: 4 }}>16</div>
        <div style={{ fontFamily: MN, fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Houses</div>
      </Inset>
      <PrimaryBtn>Submit Guess</PrimaryBtn>
      <SecondaryBtn>Stuck? Ask a Friend</SecondaryBtn>
    </div>
  );
}

// ─── SOF — current play ───
function SofPlayCurrent() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper, padding: '36px 12px 14px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: SR }}>
      <MiniMast />
      <div style={{ fontFamily: MN, fontSize: 8, color: C.muted, letterSpacing: '0.14em', marginBottom: 6 }}>← BACK TO HOME</div>
      <LabelRow label="Science or Fiction" />
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <div style={{ flex: 1, padding: '6px 0', textAlign: 'center', background: C.ink }}>
          <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 9, color: C.onDark, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Standard</span>
        </div>
        <div style={{ flex: 1, padding: '6px 0', textAlign: 'center', border: `1px solid ${C.ink}` }}>
          <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 9, color: C.ink, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Weird & True</span>
        </div>
      </div>
      <Inset>
        <div style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase' }}>Topic</div>
        <div style={{ fontFamily: SR, fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 2 }}>Octopus Cognition</div>
        <div style={{ fontFamily: SR, fontSize: 11, color: C.muted, lineHeight: 1.4, marginTop: 4 }}>Three claims about cephalopod intelligence — only one is fabricated.</div>
      </Inset>
      <div style={{ fontFamily: SR, fontStyle: 'italic', fontSize: 10, color: C.muted, marginBottom: 8 }}>Mark each claim as Science (real) or Fiction (fabricated).</div>
      {[
        { n: 1, text: 'Octopuses have neurons distributed across their arms and can solve puzzles independently with each one.', vote: 'science' },
        { n: 2, text: 'Common octopuses can identify and remember individual humans by scent through their suckers.', vote: 'fiction' },
        { n: 3, text: "Cephalopods edit their RNA to adapt to cold water — humans don't.", vote: null },
      ].map((c, i) => (
        <Inset key={i}>
          <div style={{ fontFamily: MN, fontSize: 8, letterSpacing: '0.16em', color: C.muted, textTransform: 'uppercase' }}>Claim {c.n}</div>
          <div style={{ fontFamily: SR, fontSize: 12, color: C.ink, lineHeight: 1.4, marginTop: 4, marginBottom: 8 }}>{c.text}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, padding: '8px 0', textAlign: 'center', background: c.vote === 'science' ? C.ink : 'transparent', border: `1px solid ${C.ink}` }}>
              <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 9, color: c.vote === 'science' ? C.onDark : C.ink, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Science</span>
            </div>
            <div style={{ flex: 1, padding: '8px 0', textAlign: 'center', background: c.vote === 'fiction' ? C.ink : 'transparent', border: `1px solid ${C.ink}` }}>
              <span style={{ fontFamily: MN, fontWeight: 700, fontSize: 9, color: c.vote === 'fiction' ? C.onDark : C.ink, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Fiction</span>
            </div>
          </div>
        </Inset>
      ))}
      <PrimaryBtn>Lock In</PrimaryBtn>
    </div>
  );
}

Object.assign(window, { LedePlayCurrent, SpreadPlayCurrent, SofPlayCurrent });
