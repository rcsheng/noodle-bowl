# App Store Listing — Alpha v0.3.0

Reference doc for filling out App Store Connect and designing screenshot frames.
Character counts shown in brackets `[n/max]`.

---

## 1. App Store Connect fields

### Name `[11/30]`
```
Noodle Bowl
```

### Subtitle `[26/30]`
```
The Weekly News Brain Game
```

### Description `[~980/4000]`

```
Noodle Bowl is a weekly brain workout built from real news.

Three games. One week of fresh stories. Play at your own pace — no timer, no pressure, just genuine news challenge.

THE LEDE
Three endings for today's headline. Only one is real. Can you spot the fabricated options from the actual news?

THE SPREAD
A number is hiding in a real news story. Four choices. One is right. Straightforward on the surface — surprisingly tricky underneath.

SCIENCE OR FICTION
Two claims about science or health. One is real and cited. One is fabricated. Find the real one before your confidence gets you.

---

KEEP YOUR STREAK ALIVE
Play every week to build your streak. Miss a week and it resets — unless you have a shield. Earn shields by challenging friends. One shield saves your streak for one week when life gets in the way.

CHALLENGE YOUR FRIENDS
Stuck on a question? Send it to a friend. They get the same question and can help you out — or you can challenge them and see who does better.

FRESH EVERY WEEK
New stories, new questions, every week. All content is drawn from real news — no trivia databases, no recycled questions.

---

Free to play. No ads. No in-app purchases.
```

> **Usage note:** The `---` dividers above are plain hyphens — remove them if App Store Connect doesn't render them cleanly. The ALL CAPS section headers are safe (no special formatting required by App Store).

---

### Promotional Text `[≤170 chars]`

> Unlike the description, promotional text can be **updated at any time without submitting a new app version**. It appears above the description on the product page (before the "more" fold). Use it for launch announcements or timely hooks. Leave blank if you don't need it — it's optional.

**At launch:**
```
Now on the App Store. Three news games, fresh every week. Free to play — no ads, no in-app purchases.
```
`[100/170]`

**After launch (evergreen fallback):**
```
Think you keep up with the news? Put it to the test — three games, real stories, every week.
```
`[91/170]`

---

### Keywords `[89/100]`
```
news,trivia,quiz,puzzle,daily,brain game,current events,headlines,challenge,science,streak
```

> Comma-separated, no spaces after commas. 89 of 100 characters used.

---

### Primary Category
**Games › Trivia**

### Secondary Category (optional)
**News**

---

### Age Rating
**4+** — No violence, no adult content, no in-app purchases. Content is drawn from real news headlines but framed as trivia; no graphic material.

> When completing the age rating questionnaire in App Store Connect, answer "No" / "None" to all content questions. The finished rating will be 4+.

---

### URLs

| Field | Value |
|---|---|
| Support URL | `https://noodlebowl.app` |
| Marketing URL | `https://noodlebowl.app` *(optional — same as support is fine)* |
| Privacy Policy URL | `https://noodlebowl.app/privacy` |

---

### Version & Build info (for reference)

| Field | Value |
|---|---|
| Version string | `1.1.0` |
| Bundle ID | `app.noodlebowl.noodlebowl` |
| What's New | Streak & shield onboarding — earn shields by challenging friends, protect your weekly streak |

---

## 2. Screenshot marketing copy

Use these as overlay text when designing screenshot frames in Figma / Canva / etc.  
Format: **bold headline** + *italic subtext* per screenshot slot.

### Screenshot 1 — Home screen
> **This Week's Games Are Ready.**
> *Three rounds. Real news. Play at your pace.*

### Screenshot 2 — The Lede
> **Spot the Real Headline.**
> *Three endings. Only one actually happened.*

### Screenshot 3 — The Spread
> **How Close Can You Get?**
> *Guess the number hiding in today's story.*

### Screenshot 4 — Science or Fiction
> **Real Science or Clever Fake?**
> *One claim is cited. One is fabricated. Find it.*

### Screenshot 5 — Streak & shields (Stats tab or masthead chip)
> **Build Your Streak. Earn Shields.**
> *Play every week. Challenge friends. Stay alive.*

### Screenshot 6 — Challenge a friend *(optional — use if you have a 6th slot)*
> **Stuck? Challenge a Friend.**
> *Send the question. See who gets it right.*

---

## 3. App preview video display names *(if you make preview videos)*

App Store Connect asks for a "Display Name" for each preview clip.

| Clip | Display Name |
|---|---|
| Home → game flow | `Three games. One week of news.` |
| The Lede gameplay | `Finish the headline.` |
| The Spread gameplay | `Guess the number.` |
| Science or Fiction gameplay | `Find the real science.` |

---

## 4. Required screenshot sizes

Apple requires **at least one 6.9" iPhone screenshot** (iPhone 16 Pro Max: 1320 × 2868 px).  
Optional but recommended: **6.7"** (1290 × 2796 px) for older devices.

> iPad screenshots are required only if you check "Supports iPad" in App Store Connect. Noodle Bowl is iPhone-only for this release — leave iPad unchecked to skip that requirement.

---

## 5. Checklist

- [ ] Name & subtitle entered
- [ ] Description pasted and proofread (check `---` dividers render correctly)
- [ ] Keywords entered (≤ 100 chars)
- [ ] Category set: Games › Trivia + News secondary
- [ ] Age rating questionnaire completed → 4+
- [ ] Privacy policy URL: `https://noodlebowl.app/privacy`
- [ ] Support URL entered
- [ ] Screenshots uploaded — 6.9" minimum (5–6 images)
- [ ] App preview video uploaded *(optional)*
- [ ] Version `0.3.0` and correct build selected
- [ ] Status → **Ready for Review**
