# Iron Journal — Project Context for Claude Code

## What this is

A workout tracking app called **Iron Journal**, originally built as a single
self-contained HTML file (vanilla JS, no framework) and now being migrated to
a proper **React + Vite** app so it can be deployed to **Vercel** as a real,
bookmarkable / home-screen-installable web app (PWA-style).

The current working prototype is a single `iron-journal.html` file — fully
functional, already wired up to Supabase. That file should be treated as the
**spec / reference implementation**. The React rebuild should preserve all of
its behavior, data model, and visual design while organizing it into proper
components.

---

## Person & goals (for context on the coach feature)

The app is built for a specific person with a specific training profile:

- 36-year-old female, ectomorph, 5'6", ~130 lbs
- 10 years of on-and-off lifting (COVID gap, injuries)
- Goal: **body recomposition** — look fit and strong, not competing
- Was eating ~1,300 cal/day (way too low) — now targeting ~2,000 cal/day,
  130–145g protein
- Trains 4x/week on an Upper/Lower split (may change to 3x/week or other
  splits in the future — **this is why the program needs to be fully
  editable, not hardcoded**)
- Current approximate lifts: Squat ~135 lbs (limiter = bottom-position
  tightness, not strength), Deadlift ~170 lbs (strongest lift), Bench ~72 lbs
  (limiter = pressing endurance/confidence, not strength), OHP 45 lbs,
  Assisted Pull-ups Level 9 (close to unassisted), Barbell Row 55 lbs

This context is baked into the AI coach's system prompt so it gives relevant,
personalized advice.

---

## Core features (all already working in the HTML prototype)

### 1. Per-set logging
- Each exercise shows a table of **sets as rows**, not a single sets×reps
  input
- Each row has: set number, a **weight input** (numeric keyboard, `lbs`),
  and a **reps stepper** (− / value / +)
- "+ Add Set" button appends a new row (pre-filled with the previous row's
  weight as a convenience)
- Rows can be deleted (minimum 1 row always remains)
- A colored dot on the exercise card lights up once any set has reps > 0

### 2. Editable program (days + exercises)
- The program is **not hardcoded** — it's a data structure:
  ```
  program = {
    days: [
      { id, name, focus, color, exercises: [
        { id, name, sets, reps, note }, ...
      ]}, ...
    ]
  }
  ```
- Day tabs (pill buttons) at the top let you switch between training days
- An **Edit Program** screen (separate from the log screen) lets you:
  - Rename a day, change its focus label
  - Add a new day (inline form, not a browser `prompt()`)
  - Delete a day (keeps at least 1)
  - Add / rename / delete exercises within a day
  - Change sets/reps/note per exercise inline
  - **Drag-to-reorder exercises** within a day:
    - No visible drag handle icon (caused accidental drags)
    - Instead: **long-press (300ms) on empty space in the row** arms drag
      mode — row gets a glowing accent border as a visual cue
    - A movement threshold prevents accidental reorders from finger wobble:
      **12px for touch, 8px for mouse**
    - If you press-and-hold but don't move past the threshold, releasing
      does *nothing* (no reorder) — this was a specific bug fix
    - Text selection is disabled globally while a row is armed for dragging
  - A "← Back" button returns to the log screen without forcing any save
    beyond what's already been auto-saved per-field

### 3. Progress screen
- **Weekly volume per exercise** — computed as Σ(weight × reps) per exercise
  per calendar week (week starts Sunday), shown as small bar-chip rows for
  the last 6 weeks
- **Session history** — flat list of all saved sessions (day name, date,
  time), color-coded by day

### 4. AI Coach chat (Claude API via Anthropic completions endpoint)
- A collapsible chat panel at the bottom of the log screen
- Has a system prompt baked in with the person's full training profile (see
  above)
- When the user is on a given day with sets logged, the current session's
  logged data is included as context in the message sent to Claude, e.g.:
  ```
  Session: Lower A (Squat Focus)
  - Back Squat: Set1 135lbs×5, Set2 135lbs×5 (target 3x5)
  ```
- **The coach can modify the program directly.** The system prompt
  instructs Claude to append a hidden `<program_change>...</program_change>`
  JSON block to its reply when suggesting a program change, e.g.:
  ```json
  {"action":"add_exercise","dayId":"day-la","data":{"name":"Face Pull","sets":3,"reps":15,"note":"Shoulder health"}}
  ```
  Supported actions: `add_exercise`, `remove_exercise`, `update_exercise`,
  `rename_day`, `add_day`, `remove_day`
- When a `program_change` block is detected, the chat UI shows a
  **"✓ Apply suggested program change" button** — the user must explicitly
  tap it to apply; nothing changes automatically
- Quick-prompt suggestion chips for common questions

### 5. Supabase persistence (already wired up and working)
- **Two tables:**
  ```sql
  create table sessions (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now(),
    day_name text, day_id text, color text,
    date text, time text, week_key text,
    sets jsonb, exercises jsonb
  );

  create table program (
    id text primary key,  -- NOTE: changed from uuid to text so 'singleton' works
    updated_at timestamptz default now(),
    data jsonb
  );
  ```
- `program` table uses a **single row with id = 'singleton'**, upserted on
  every change
- `sessions` table gets a new row inserted every time "Save Session" is
  tapped
- **RLS is disabled** on both tables for now (anon key has full grant) — no
  auth yet, this is a single-user personal app for the moment
- **localStorage is used as a cache/fallback**: every save writes to
  localStorage immediately (so the UI never feels slow), then syncs to
  Supabase in the background. On app load, it fetches from Supabase first
  and falls back to localStorage if that fails
- Supabase credentials currently live directly in the HTML file as
  JS constants (`SUPA_URL`, `SUPA_KEY` — anon/public key, safe to expose
  client-side). **In the React app these should move to a `.env` file**
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and be excluded from git
  via `.gitignore`.

### 6. Sync status indicator
- A small pill in the top-right of the header shows: `saving…` (muted) →
  `✓ saved` (green, fades after 2s) → or `sync failed` (red, stays visible)
- **Known bug we fixed:** the fade-out was setting an inline
  `style.opacity = '0'`, which permanently overrode the CSS class-based
  opacity on all subsequent state changes (inline styles beat classes in
  specificity). Fix: always clear `el.style.opacity = ''` at the top of the
  status-setter function, and on fade-out remove the state class instead of
  setting inline opacity directly.
- Program field edits (text inputs in Edit mode) needed to switch from
  `onchange` (only fires on blur) to `oninput` (fires every keystroke) with
  a **600ms debounce** before actually calling Supabase — otherwise typing
  multiple changes into the same focused field without tabbing away never
  triggered a second save.

---

## Visual design language

- **Dark theme**, near-black background (`#080810`)
- **Fonts:**
  - `Oswald` (600/700 weight) — used for the **logo/wordmark only**: "IRON"
    in accent green, "JOURNAL" in off-white, both uppercase, letter-spaced,
    condensed and rugged-looking (explicitly *not* elegant/cursive — this
    was a deliberate revision away from an earlier `Playfair Display`
    italic treatment that felt too soft)
  - `Playfair Display` (italic) — still used for exercise names and section
    headers elsewhere, giving a "journal" feel contrasted against the bold
    logo
  - `DM Mono` — used for all UI chrome, numbers, buttons, labels (gives a
    technical/utilitarian feel appropriate for a training log)
- **Accent color:** `#4dffaa` (mint green) — used for the active state,
  sync-ok indicator, drag-armed border, primary buttons
- **Day color-coding:** each training day gets a distinct color from a
  palette (`#4dffaa`, `#ff8c42`, `#5ab4ff`, `#c084fc`, `#ffd166`, `#ef476f`,
  `#06d6a0`) used for its pill tab, header background tint, and save button
- Mobile-first, touch-friendly: minimum 44–48px touch targets throughout,
  16px+ font sizes on inputs (prevents iOS auto-zoom-on-focus), large
  reps-stepper buttons

---

## Migration plan: HTML → React + Vite + Vercel

### Already done (as of this handoff)
- Node.js + npm installed and confirmed working
- Vite React project scaffolded at `~/Repos/iron-journal` (chose **ESLint**
  over Oxlint during setup)
- `@supabase/supabase-js` installed
- Git initialized, SSH key generated and added to GitHub, repo connected
  and push access confirmed working

### Still to do
1. **Move Supabase credentials to `.env`**
   ```
   VITE_SUPABASE_URL=https://mmyffkpksusyosvgwend.supabase.co
   VITE_SUPABASE_ANON_KEY=<the anon key>
   ```
   Access via `import.meta.env.VITE_SUPABASE_URL` etc. Add `.env` to
   `.gitignore`.

2. **Break the single HTML file into components**, roughly:
   - `App.jsx` — top-level state (program, sessions, currentDayId,
     currentScreen), Supabase client init, load-on-mount
   - `components/TopBar.jsx` — logo, sync indicator, edit/progress icon
     buttons
   - `components/DayTabs.jsx` — pill tabs for switching days (hidden on
     non-log screens)
   - `components/LogScreen.jsx` — day header + exercise cards + save button
     + coach chat
   - `components/ExerciseCard.jsx` — one exercise's set table
   - `components/SetRow.jsx` — single set row (weight input + reps stepper
     + delete)
   - `components/ProgressScreen.jsx` — weekly volume + session history
   - `components/EditScreen.jsx` — full program editor
   - `components/CoachChat.jsx` — chat UI + Anthropic API call + apply
     program-change logic
   - `lib/supabase.js` — Supabase client singleton
   - `lib/storage.js` — localStorage read/write helpers (cache layer)
   - `hooks/useProgram.js` / `useSessions.js` — optional custom hooks to
     encapsulate the load/save/sync logic cleanly

3. **Re-implement the drag-to-reorder logic** as a React-friendly version —
   the vanilla JS version directly manipulates DOM classes and reads
   `dataset` attributes; in React this should likely become local state
   (`armedId`, `draggingId`, `dragOverId`) driving conditional class names,
   keeping the same UX behavior (long-press to arm, movement threshold,
   no-op if released without crossing the threshold).

4. **Move the Anthropic API call** for the coach chat into a clean function
   (e.g. `lib/coach.js`), keeping the same system prompt content described
   above. Decide whether to keep calling `api.anthropic.com` directly from
   the client (fine for personal use) or proxy through a serverless
   function later if this is ever shared with others.

5. **Set up `.gitignore`** to exclude `node_modules`, `.env`, `dist`.

6. **Deploy to Vercel:**
   - Push the repo to GitHub (already connected)
   - Go to vercel.com → New Project → import the `iron-journal` repo
   - Add the two `VITE_SUPABASE_*` environment variables in Vercel's
     project settings (Settings → Environment Variables)
   - Deploy — Vercel auto-detects Vite and builds correctly out of the box
   - Every future `git push` to the main branch auto-redeploys

7. **Add to iPhone home screen** once deployed: Safari → Share → Add to
   Home Screen. For a more native PWA feel later, consider adding a
   `manifest.json` and service worker (not urgent for v1).

---

## Reference file

The current fully-working prototype is `iron-journal.html` — a single file
with all CSS and JS inline. **Read this file in full before starting the
rebuild** — it is the ground truth for exact behavior, copy, and styling
down to specific pixel values, color codes, and edge-case handling (e.g. the
sync indicator bug, the debounce timing, the drag thresholds). When in
doubt about how something should behave, match what this file already does
rather than re-inventing it.
