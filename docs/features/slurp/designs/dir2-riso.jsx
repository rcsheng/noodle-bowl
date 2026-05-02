// dir2-riso.jsx — Direction 2: RISO BROTH
// 2-color riso zine: chili-red + miso-mustard on warm cream. Halftone dots,
// hand-drawn outlines, slight misregistration, photocopied indie-comic vibe.

const R = {
  cream: '#f5ecd9',
  creamDeep: '#ecdfb8',
  ink: '#2b2014',
  red: '#e54a3b',
  redShift: '#cc3d2e',  // for misregistration
  mustard: '#d9a52a',
  mustardShift: '#c89322',
  scallion: '#5e8a3a',
  shadow: 'rgba(43,32,20,0.12)',
};

// Halftone dot pattern overlay
const halftone = `radial-gradient(circle at 1px 1px, rgba(43,32,20,0.18) 0.7px, transparent 1.4px) 0 0 / 4px 4px`;
const halftoneRed = `radial-gradient(circle at 1px 1px, rgba(229,74,59,0.5) 0.8px, transparent 1.6px) 0 0 / 5px 5px`;

const risoBg = {
  background: `
    ${halftone},
    radial-gradient(ellipse 90% 70% at 80% 20%, rgba(217,165,42,0.12) 0%, transparent 60%),
    ${R.cream}
  `,
};

// Wobbly hand-drawn border
function RisoBorder({ children, color = R.ink, bg = R.cream, pad = 12, style = {}, double = false }) {
  return (
    <div style={{
      position: 'relative', padding: pad, background: bg,
      border: `2px solid ${color}`, borderRadius: 6,
      ...(double ? { boxShadow: `4px 4px 0 ${color}, -3px 3px 0 ${R.red}` } : { boxShadow: `3px 3px 0 ${color}` }),
      ...style,
    }}>
      {children}
    </div>
  );
}

// Misregistered text — colored shadow offset
function RisoMisreg({ children, color = R.ink, shift = R.red, size = 28, weight = 900, dx = 2, dy = 1, italic = false, font = '"Inter Display", "Helvetica Black", sans-serif' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 0.95, fontStyle: italic ? 'italic' : 'normal', letterSpacing: '-0.02em' }}>
      <span style={{ position: 'absolute', top: dy, left: dx, color: shift, mixBlendMode: 'multiply' }} aria-hidden>{children}</span>
      <span style={{ position: 'relative', color }}>{children}</span>
    </span>
  );
}

// Letter tile — riso version: hand-drawn rounded square, halftone fill
function RisoTile({ letter, value, selected = false, size = 36 }) {
  const fill = selected ? R.red : R.cream;
  const fg = selected ? R.cream : R.ink;
  return (
    <div style={{
      width: size, height: size, position: 'relative', flexShrink: 0,
      background: fill, color: fg,
      borderRadius: 8, border: `2px solid ${R.ink}`,
      boxShadow: selected ? `2px 3px 0 ${R.ink}` : `2px 2px 0 ${R.mustard}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Inter Display", sans-serif', fontWeight: 900,
      fontSize: size * 0.5, transform: `rotate(${(letter.charCodeAt(0) % 5) - 2}deg)`,
    }}>
      {!selected && (
        <div style={{ position: 'absolute', inset: 2, background: halftoneRed, opacity: 0.35, borderRadius: 6, pointerEvents: 'none' }} />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>{letter}</span>
      <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 8, fontWeight: 700, opacity: 0.7, fontFamily: 'ui-monospace, monospace', zIndex: 1 }}>{value}</span>
    </div>
  );
}

function RisoLanding() {
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', position: 'relative', paddingTop: 40 }}>
      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.25em' }}>VOL. 01 / ISSUE 7</div>
        <div style={{ marginTop: 2 }}>
          <RisoMisreg size={36}>SLURP</RisoMisreg>
          <RisoMisreg size={36} color={R.mustard} shift={R.scallion} font='"Times New Roman", serif' italic>!</RisoMisreg>
        </div>
        <div style={{ fontFamily: '"Times New Roman", serif', fontStyle: 'italic', fontSize: 11, color: R.ink, marginTop: 2 }}>
          a noodle-soup zine of luck & vocabulary
        </div>
      </div>

      {/* hero illo block */}
      <div style={{ padding: '14px 16px 0' }}>
        <RisoBorder color={R.ink} bg={R.creamDeep} pad={0} double>
          <div style={{ height: 130, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
            {/* big bowl SVG */}
            <svg viewBox="0 0 200 130" style={{ width: '100%', height: '100%', display: 'block' }}>
              <defs>
                <pattern id="ht1" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.7" fill={R.ink} opacity="0.35"/>
                </pattern>
              </defs>
              {/* steam */}
              <path d="M70 30 q-4 -8 0 -16 q4 -8 0 -16" stroke={R.red} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
              <path d="M100 30 q-4 -8 0 -16 q4 -8 0 -16" stroke={R.red} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
              <path d="M130 30 q-4 -8 0 -16 q4 -8 0 -16" stroke={R.red} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
              {/* bowl */}
              <ellipse cx="100" cy="60" rx="78" ry="14" fill={R.mustard} stroke={R.ink} strokeWidth="2.5"/>
              <ellipse cx="100" cy="58" rx="72" ry="9" fill={R.red}/>
              <ellipse cx="100" cy="58" rx="72" ry="9" fill="url(#ht1)"/>
              <path d="M22 60 q3 50 78 50 q75 0 78 -50" fill={R.cream} stroke={R.ink} strokeWidth="2.5"/>
              <path d="M22 60 q3 50 78 50 q75 0 78 -50" fill="url(#ht1)" opacity="0.5"/>
              {/* chopsticks */}
              <line x1="160" y1="20" x2="190" y2="55" stroke={R.ink} strokeWidth="3" strokeLinecap="round"/>
              <line x1="170" y1="18" x2="195" y2="50" stroke={R.ink} strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </RisoBorder>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <button style={{
          width: '100%', padding: '13px 0', background: R.ink, color: R.cream,
          border: `2px solid ${R.ink}`, borderRadius: 6,
          fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 14,
          letterSpacing: '0.2em', cursor: 'pointer',
          boxShadow: `3px 3px 0 ${R.red}`,
        }}>START A RUN</button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 12 }}>
          {[['BEST', '14,820'],['RUNS', '7'],['WINS', '2']].map(([k,v],i) => (
            <RisoBorder key={i} color={R.ink} bg={i===1?R.mustard:R.cream} pad={6} style={{ textAlign: 'center', boxShadow: `2px 2px 0 ${R.ink}` }}>
              <div style={{ fontSize: 7, fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: '0.18em', color: R.ink, opacity: 0.7 }}>{k}</div>
              <div style={{ fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 14, color: R.ink, marginTop: 1 }}>{v}</div>
            </RisoBorder>
          ))}
        </div>
      </div>

      <MiniTabBar
        active={2}
        bg={R.cream}
        tint={R.red}
        dim="rgba(43,32,20,0.4)"
        topBorder={R.ink}
        items={[
          { glyph: '⌂', label: 'Home' },
          { glyph: '◫', label: 'Stats' },
          { glyph: '🍜', label: 'Slurp' },
          { glyph: '⚐', label: 'Friends' },
          { glyph: '◯', label: 'Me' },
        ]}
      />
    </div>
  );
}

function RisoBrothSelect() {
  const bases = [
    { name: 'Classic Chicken', tag: 'balanced', emoji: '🐓', col: R.cream },
    { name: 'Tonkotsu', tag: 'high variance', emoji: '🐷', col: R.mustard },
    { name: 'Clear Dashi', tag: 'consistent', emoji: '🌊', col: R.cream },
    { name: 'Miso', tag: 'mid-range', emoji: '🌰', col: R.creamDeep },
  ];
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', paddingTop: 40 }}>
      <div style={{ padding: '8px 16px 12px' }}>
        <div style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>STEP 1 / 9</div>
        <RisoMisreg size={22}>pick your broth</RisoMisreg>
      </div>
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {bases.map((b, i) => (
          <div key={i} style={{
            background: i===1 ? R.red : b.col, color: i===1 ? R.cream : R.ink,
            border: `2px solid ${R.ink}`, borderRadius: 6,
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: i===1 ? `3px 3px 0 ${R.ink}, -2px 2px 0 ${R.mustard}` : `2px 2px 0 ${R.ink}`,
            transform: `rotate(${(i%2===0?-0.4:0.4)}deg)`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6, background: R.cream,
              border: `2px solid ${R.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{b.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 14, letterSpacing: '-0.01em' }}>{b.name}</div>
              <div style={{ fontFamily: '"Times New Roman", serif', fontStyle: 'italic', fontSize: 10, opacity: 0.8 }}>{b.tag}</div>
            </div>
            {i===1 && <div style={{ fontSize: 18, transform: 'rotate(15deg)' }}>★</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function RisoPlay() {
  const bowl = [
    { l: 'S', v: 1, sel: true }, { l: 'L', v: 1, sel: true }, { l: 'U', v: 1, sel: true },
    { l: 'R', v: 1, sel: true }, { l: 'P', v: 3, sel: true },
    { l: 'A', v: 1 }, { l: 'E', v: 1 },
  ];
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', paddingTop: 38, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '4px 14px 8px', borderBottom: `2px solid ${R.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>APPETIZER · BOWL TASTING</div>
          <RisoMisreg size={16} dx={1.5} dy={1}>quota 450</RisoMisreg>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: R.red }}>3</div>
            <div style={{ fontSize: 7, fontWeight: 700, opacity: 0.6, letterSpacing: '0.15em' }}>SLURPS</div>
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: R.ink }}>2</div>
            <div style={{ fontSize: 7, fontWeight: 700, opacity: 0.6, letterSpacing: '0.15em' }}>SPITS</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 14px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 3, color: R.ink }}>
          <span>BROTH 287</span><span>/ 450</span>
        </div>
        <div style={{ height: 9, background: R.cream, border: `1.5px solid ${R.ink}`, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: '64%', height: '100%', background: R.red, borderRadius: 999, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: halftoneRed, opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* toppings */}
      <div style={{ padding: '6px 14px', display: 'flex', gap: 4 }}>
        {['CHILI','EGG','NORI','GREEN','+'].map((t,i) => (
          <div key={i} style={{
            flex: 1, background: i<4 ? R.mustard : R.cream,
            border: `1.5px solid ${R.ink}`, borderRadius: 4,
            padding: '4px 0', textAlign: 'center',
            fontSize: 7, fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: '0.1em',
            color: R.ink,
          }}>{t}</div>
        ))}
      </div>

      {/* word being built */}
      <div style={{ margin: '10px 14px', padding: '10px 12px', background: R.creamDeep, border: `2px solid ${R.ink}`, borderRadius: 6, position: 'relative' }}>
        <div style={{ fontSize: 7, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>NOODLE · 5 LETTERS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
          <RisoMisreg size={26}>SLURP</RisoMisreg>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, color: R.ink }}>
            17 × 2.5 = <span style={{ color: R.red, fontSize: 13, fontWeight: 900 }}>42</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          {bowl.map((t,i) => <RisoTile key={i} letter={t.l} value={t.v} selected={t.sel} size={32} />)}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button style={{ flex: 2, padding: '10px 0', background: R.ink, color: R.cream, border: 'none', borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 11, letterSpacing: '0.18em', boxShadow: `2px 2px 0 ${R.red}`, cursor: 'pointer' }}>SLURP!</button>
          <button style={{ flex: 1, padding: '10px 0', background: R.cream, color: R.ink, border: `2px solid ${R.ink}`, borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}>spit</button>
          <button style={{ flex: 1, padding: '10px 0', background: R.mustard, color: R.ink, border: `2px solid ${R.ink}`, borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 11, letterSpacing: '0.12em', cursor: 'pointer' }}>spice</button>
        </div>
      </div>
    </div>
  );
}

function RisoScoreReadout() {
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', paddingTop: 40 }}>
      <div style={{ padding: '8px 14px' }}>
        <div style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>RAMEN PATTERN · 6 LETTERS</div>
        <RisoMisreg size={32}>NOODLE</RisoMisreg>
      </div>

      <RisoBorder color={R.ink} bg={R.cream} pad={12} style={{ margin: '8px 14px', boxShadow: `3px 3px 0 ${R.ink}, -2px 2px 0 ${R.red}` }}>
        {[
          ['letter chips', '+8'],
          ['ramen base', '+20'],
          ['crispy shallots', '×3 ssn'],
          ['scallions', '+3 ssn'],
        ].map(([a,b],i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '5px 0', borderBottom: i<3 ? `1px dashed ${R.ink}` : 'none',
            fontFamily: '"Times New Roman", serif',
          }}>
            <span style={{ fontSize: 11, fontStyle: 'italic', color: R.ink }}>{a}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: R.red, fontFamily: '"Inter Display", sans-serif' }}>{b}</span>
          </div>
        ))}
        <div style={{ borderTop: `2px solid ${R.ink}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700 }}>30 × 7.5 =</span>
          <RisoMisreg size={32} color={R.red} shift={R.mustard}>225</RisoMisreg>
        </div>
      </RisoBorder>

      <div style={{ textAlign: 'center', marginTop: 10, fontFamily: '"Times New Roman", serif', fontStyle: 'italic', color: R.ink, fontSize: 11 }}>tap to keep slurping →</div>
    </div>
  );
}

function RisoMarket() {
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', paddingTop: 40, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '4px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px dashed ${R.ink}` }}>
        <div>
          <div style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>INTERMISSION</div>
          <RisoMisreg size={22}>The Market</RisoMisreg>
        </div>
        <div style={{ background: R.mustard, border: `2px solid ${R.ink}`, padding: '4px 8px', borderRadius: 4, fontFamily: 'ui-monospace, monospace', fontWeight: 900, fontSize: 12, color: R.ink, boxShadow: `2px 2px 0 ${R.ink}` }}>¢42</div>
      </div>

      <div style={{ flex: 1, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { name: 'Shiitake', sub: 'topping', price: 4, col: R.cream },
          { name: 'Nori', sub: 'topping', price: 4, col: R.mustard },
          { name: 'Broth Pack', sub: 'flavor', price: 4, col: R.cream },
          { name: 'Spice Pack', sub: 'flavor', price: 4, col: R.creamDeep },
          { name: 'Mise en Place', sub: 'pantry', price: 10, col: R.cream },
          { name: 'Sichuan Pep', sub: 'spice', price: 3, col: R.mustard },
        ].map((it,i) => (
          <div key={i} style={{
            background: it.col, border: `2px solid ${R.ink}`, borderRadius: 6,
            padding: '8px 8px 6px', boxShadow: `2px 2px 0 ${R.ink}`,
            transform: `rotate(${i%2===0?-0.5:0.5}deg)`,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 7, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.2em' }}>{it.sub}</div>
            <div style={{ fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 12, color: R.ink, marginTop: 2, lineHeight: 1.05 }}>{it.name}</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 900, fontSize: 10 }}>¢{it.price}</div>
              <div style={{ background: R.red, color: R.cream, padding: '2px 6px', fontSize: 8, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, letterSpacing: '0.1em', borderRadius: 3 }}>BUY</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', gap: 6 }}>
        <button style={{ flex: 1, padding: '10px', background: R.cream, border: `2px solid ${R.ink}`, borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 10, letterSpacing: '0.15em', cursor: 'pointer' }}>REROLL ¢5</button>
        <button style={{ flex: 1, padding: '10px', background: R.ink, color: R.cream, border: 'none', borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 10, letterSpacing: '0.15em', cursor: 'pointer', boxShadow: `2px 2px 0 ${R.red}` }}>NEXT →</button>
      </div>
    </div>
  );
}

function RisoRunSummary() {
  return (
    <div style={{ ...risoBg, width: '100%', height: '100%', paddingTop: 40, position: 'relative' }}>
      <div style={{ padding: '8px 14px' }}>
        <div style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', color: R.red, fontWeight: 700, letterSpacing: '0.25em' }}>★ RUN COMPLETE ★</div>
        <div style={{ marginTop: 2 }}>
          <RisoMisreg size={28}>well</RisoMisreg>{' '}
          <RisoMisreg size={28} color={R.red} shift={R.mustard} italic font='"Times New Roman", serif'>slurped!</RisoMisreg>
        </div>
      </div>

      <RisoBorder color={R.ink} bg={R.creamDeep} pad={14} style={{ margin: '12px 14px', boxShadow: `4px 4px 0 ${R.ink}, -3px 3px 0 ${R.red}` }}>
        <div style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', color: R.ink, opacity: 0.6, letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center' }}>FINAL SCORE</div>
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <RisoMisreg size={44} color={R.red} shift={R.mustard}>38,420</RisoMisreg>
        </div>
        <div style={{ borderTop: `1.5px dashed ${R.ink}`, marginTop: 10, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[['Best slurp', 'TONKOTSU 1,840'],['Top pattern', 'Pho ×4'],['Coins', '92'],['Toppings', '5/5']].map(([k,v],i) => (
            <div key={i}>
              <div style={{ fontSize: 7, fontFamily: 'ui-monospace, monospace', color: R.ink, opacity: 0.6, letterSpacing: '0.15em', fontWeight: 700 }}>{k.toUpperCase()}</div>
              <div style={{ fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 11, color: R.ink, marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </RisoBorder>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button style={{ padding: '12px', background: R.red, color: R.cream, border: `2px solid ${R.ink}`, borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 12, letterSpacing: '0.18em', cursor: 'pointer', boxShadow: `2px 2px 0 ${R.ink}` }}>ENDLESS MODE →</button>
        <button style={{ padding: '10px', background: R.cream, color: R.ink, border: `2px solid ${R.ink}`, borderRadius: 5, fontFamily: '"Inter Display", sans-serif', fontWeight: 900, fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer' }}>NEW RUN</button>
      </div>
    </div>
  );
}

Object.assign(window, { R, RisoLanding, RisoBrothSelect, RisoPlay, RisoScoreReadout, RisoMarket, RisoRunSummary });
