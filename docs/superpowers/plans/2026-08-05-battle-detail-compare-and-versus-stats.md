# Bouton "Comparer les joueurs" + nouvelles stats Versus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Comparer les joueurs" button on the Détail Combat page (navigating to Versus with both battle participants pre-selected), rename that page's delete button to "Supprimer le combat", and add 4 new per-player stats to the Versus page (KO infligés/combat, KO reçus/combat, Pokémon joués, Pokémon favori).

**Architecture:** No new components. Two existing screens get targeted edits: `BattleDetail.jsx` gains a button + prop, `App.jsx` wires that prop using the same `selectedVersusPlayers` state / `navigateTo('versusDetail')` pattern already used by `PlayerDetail`'s own "Comparer" button. `VersusPage.jsx`'s existing `calcPlayerStats` function gains 4 more derived fields, rendered as 4 more rows in its two existing stat-row lists.

**Tech Stack:** React (CRA/`react-scripts`), Tailwind classes via theme token props (`t.*`), `lucide-react` icons, in-house `i18n` (`src/i18n/index.js`, 5 locales: fr/en/es/de/ja) consumed via `useTranslation()` → `tr('namespace.key')`.

## Global Constraints

- Never run `git commit` or `git push` — the user commits and pushes manually. Every task below ends with the code changed and saved, not committed.
- Do not start a dev server or take screenshots without asking the user first (no automatic preview).
- `BattleDetail.jsx` uses `tr('...')` for all its visible button/section labels — new visible label text on this page must go through the same `i18n` system (all 5 locale objects in `src/i18n/index.js`), not be hardcoded.
- `VersusPage.jsx`, by contrast, hardcodes every stat label directly in French (no `tr()` calls anywhere in that file) — new stat labels must match that existing convention exactly, i.e. hardcoded French strings, not new i18n keys.
- Neither `BattleDetail.jsx`, `VersusPage.jsx`, nor `App.jsx` has any automated test file today (only some hooks/screens elsewhere in the repo do). Do not invent a new test harness for these three files — verify each task by reading the edited code back and running `npm run build` (catches syntax/JSX errors and unused-var lint failures) instead of writing new Jest tests, consistent with how the rest of this codebase treats these files.
- The confirmation-modal delete button (`BattleDetail.jsx` ~line 954, `tr('common.delete')`) and the shared `common.delete` key used by `Battles.jsx`/`Teams.jsx`/`TeamDetail.jsx`/`PlayerDetail.jsx`/`Players.jsx` must NOT change — only the one full-width delete button inside `BattleDetail.jsx`'s scrollable content changes its label/key.

---

### Task 1: Add i18n keys for the two `BattleDetail` buttons

**Files:**
- Modify: `src/i18n/index.js` (`battles` object in each of the 5 locale objects: `fr` ~L36-53, `en` ~L174-191, `es` ~L310-324, `de` ~L439-453, `ja` ~L568-582)

**Interfaces:**
- Produces: `tr('battles.deleteButton')`, `tr('battles.compareButton')` — consumed by Task 2.

- [ ] **Step 1: Add the two keys to the end of the `fr.battles` object**

In `src/i18n/index.js`, find:
```js
    player1Wins: 'Victoire Joueur 1', player2Wins: 'Victoire Joueur 2',
    totalElim: 'Pokémon éliminés',
    mvp: 'MVP',
  },
```
(this is the end of the `fr` locale's `battles` block). Replace with:
```js
    player1Wins: 'Victoire Joueur 1', player2Wins: 'Victoire Joueur 2',
    totalElim: 'Pokémon éliminés',
    mvp: 'MVP',
    deleteButton: 'Supprimer le combat',
    compareButton: 'Comparer les joueurs',
  },
```

- [ ] **Step 2: Add the two keys to the end of the `en.battles` object**

Find:
```js
    eliminated: 'eliminated',
    player1Wins: 'Player 1 wins', player2Wins: 'Player 2 wins',
    totalElim: 'Eliminated Pokémon',
    mvp: 'MVP',
  },
```
Replace with:
```js
    eliminated: 'eliminated',
    player1Wins: 'Player 1 wins', player2Wins: 'Player 2 wins',
    totalElim: 'Eliminated Pokémon',
    mvp: 'MVP',
    deleteButton: 'Delete battle',
    compareButton: 'Compare players',
  },
```

- [ ] **Step 3: Add the two keys to the end of the `es.battles` object**

Find:
```js
    eliminated: 'eliminado', player1Wins: 'Gana Jugador 1',
    player2Wins: 'Gana Jugador 2', totalElim: 'Pokémon eliminados', mvp: 'MVP',
  },
```
Replace with:
```js
    eliminated: 'eliminado', player1Wins: 'Gana Jugador 1',
    player2Wins: 'Gana Jugador 2', totalElim: 'Pokémon eliminados', mvp: 'MVP',
    deleteButton: 'Eliminar combate',
    compareButton: 'Comparar jugadores',
  },
```

- [ ] **Step 4: Add the two keys to the end of the `de.battles` object**

Find:
```js
    eliminated: 'besiegt', player1Wins: 'Spieler 1 gewinnt',
    player2Wins: 'Spieler 2 gewinnt', totalElim: 'Besiegte Pokémon', mvp: 'MVP',
  },
```
Replace with:
```js
    eliminated: 'besiegt', player1Wins: 'Spieler 1 gewinnt',
    player2Wins: 'Spieler 2 gewinnt', totalElim: 'Besiegte Pokémon', mvp: 'MVP',
    deleteButton: 'Kampf löschen',
    compareButton: 'Spieler vergleichen',
  },
```

- [ ] **Step 5: Add the two keys to the end of the `ja.battles` object**

Find:
```js
    eliminated: 'ひんし', player1Wins: 'プレイヤー1の勝利',
    player2Wins: 'プレイヤー2の勝利', totalElim: 'ひんしポケモン', mvp: 'MVP',
  },
```
Replace with:
```js
    eliminated: 'ひんし', player1Wins: 'プレイヤー1の勝利',
    player2Wins: 'プレイヤー2の勝利', totalElim: 'ひんしポケモン', mvp: 'MVP',
    deleteButton: 'バトルを削除',
    compareButton: 'プレイヤーを比較',
  },
```

- [ ] **Step 6: Verify**

Run: `node -e "require('./src/i18n/index.js')" 2>&1 | head -20` — this will fail with a module-system error (the file uses ESM `export`), which is expected and fine; instead just re-open the file and confirm all 5 `battles` blocks now have `deleteButton` and `compareButton` as their last two entries before the closing `},`. Run `npx eslint src/i18n/index.js` and confirm no new errors.

---

### Task 2: Add the "Comparer les joueurs" button and rename "Supprimer" in `BattleDetail.jsx`

**Files:**
- Modify: `src/components/BattleDetail.jsx` (import line 3, component props ~L109-125, button block ~L787-796)

**Interfaces:**
- Consumes: `tr('battles.deleteButton')`, `tr('battles.compareButton')` from Task 1; existing `p1`/`p2` locals (L323-324); existing `battle.player1`/`battle.player2`.
- Produces: new prop `onCompare?: (player1Id: string, player2Id: string) => void` on `BattleDetail`, consumed by Task 3.

- [ ] **Step 1: Import the `Scale` icon**

Find (line 3):
```js
import { ChevronLeft, ChevronRight, ChevronUp, Pencil, Calendar, Trash2, FileText, Trophy, Swords, HelpCircle, BookmarkPlus, Loader2, Target, Search, Plus } from 'lucide-react';
```
Replace with:
```js
import { ChevronLeft, ChevronRight, ChevronUp, Pencil, Calendar, Trash2, FileText, Trophy, Swords, HelpCircle, BookmarkPlus, Loader2, Target, Search, Plus, Scale } from 'lucide-react';
```

- [ ] **Step 2: Add the `onCompare` prop**

Find (~L109-125):
```js
export const BattleDetail = ({
  battle,
  players,
  teams = [],
  t,
  isDark,
  onBack,
  onEdit,
  onDelete,
  onAddTeam,
  onUpdatePlayer,
  onViewPokemon,
  onPlayerClick,
  backLabel = 'Combats',
  initialScrollY = 0,
  isBackground = false,
}) => {
```
Replace with:
```js
export const BattleDetail = ({
  battle,
  players,
  teams = [],
  t,
  isDark,
  onBack,
  onEdit,
  onDelete,
  onAddTeam,
  onUpdatePlayer,
  onViewPokemon,
  onPlayerClick,
  onCompare,
  backLabel = 'Combats',
  initialScrollY = 0,
  isBackground = false,
}) => {
```

- [ ] **Step 3: Add the button and rename the delete button**

Find (~L787-796):
```jsx
        {/* ── Supprimer ── */}
        {canDelete && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className={`w-full ${t.surface} ${t.danger} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-sm`}
          >
            <Trash2 size={18} />
            {tr('common.delete')}
          </button>
        )}
      </div>
```
Replace with:
```jsx
        {/* ── Comparer les joueurs ── */}
        {onCompare && p1 && p2 && (
          <button
            onClick={() => onCompare(battle.player1, battle.player2)}
            className={`w-full ${t.surface} ${t.accent} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-sm`}
          >
            <Scale size={18} />
            {tr('battles.compareButton')}
          </button>
        )}

        {/* ── Supprimer ── */}
        {canDelete && (
          <button
            onClick={() => setConfirmingDelete(true)}
            className={`w-full ${t.surface} ${t.danger} rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-sm`}
          >
            <Trash2 size={18} />
            {tr('battles.deleteButton')}
          </button>
        )}
      </div>
```

Note: `battle.player1`/`battle.player2` are passed to `onCompare` (raw ids), not `p1`/`p2` (resolved `Player` objects) — this matches what `App.jsx` (Task 3) expects, mirroring how `selectedVersusPlayers` is populated elsewhere in the app from raw player ids, not player objects.

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds with no new errors/warnings referencing `BattleDetail.jsx` (in particular no "'Scale' is defined but never used" and no "'onCompare' is not defined").

---

### Task 3: Wire `onCompare` into `BattleDetail` from `App.jsx`

**Files:**
- Modify: `src/App.jsx` (~L1039-1063, the live `battleDetail` render)

**Interfaces:**
- Consumes: `onCompare` prop added to `BattleDetail` in Task 2; existing `setSelectedVersusPlayers` state setter (L117) and `navigateTo` (L178).

- [ ] **Step 1: Add the `onCompare` prop to the live `BattleDetail` instance**

Find (~L1039-1063):
```jsx
      {currentTab === 'battleDetail' && (
        <BattleDetail
          battle={selectedBattle}
          players={sortedPlayers}
          teams={sortedTeams}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          initialScrollY={navDirection === 'pop' ? scrollMemoryRef.current.get('battleDetail') || 0 : 0}
          onBack={() => {
            setSelectedBattle(null);
            navigateBack();
          }}
          onEdit={(b) => {
            setSelectedBattle(b);
            setBattleEditOrigin('detail');
            setShowNewBattleForm(true);
          }}
          onDelete={handleDeleteBattle}
          onAddTeam={handleAddTeam}
          onUpdatePlayer={handleUpdatePlayer}
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
          onPlayerClick={(p) => { setSelectedPlayer(p); navigateTo('playerDetail'); }}
        />
      )}
```
Replace with:
```jsx
      {currentTab === 'battleDetail' && (
        <BattleDetail
          battle={selectedBattle}
          players={sortedPlayers}
          teams={sortedTeams}
          t={t}
          isDark={isDark}
          backLabel={backLabel}
          initialScrollY={navDirection === 'pop' ? scrollMemoryRef.current.get('battleDetail') || 0 : 0}
          onBack={() => {
            setSelectedBattle(null);
            navigateBack();
          }}
          onEdit={(b) => {
            setSelectedBattle(b);
            setBattleEditOrigin('detail');
            setShowNewBattleForm(true);
          }}
          onDelete={handleDeleteBattle}
          onAddTeam={handleAddTeam}
          onUpdatePlayer={handleUpdatePlayer}
          onViewPokemon={(p) => { setSelectedPokemon(p); navigateTo('pokemonDetail'); }}
          onPlayerClick={(p) => { setSelectedPlayer(p); navigateTo('playerDetail'); }}
          onCompare={(p1Id, p2Id) => {
            setSelectedVersusPlayers({ p1Id, p2Id });
            navigateTo('versusDetail');
          }}
        />
      )}
```

This mirrors the existing `PlayerDetail`'s `onCompare` (~L898-901): set `selectedVersusPlayers` before pushing the new tab with `navigateTo`, which — unlike `setCurrentTab` — does not reset `selectedVersusPlayers`, and pushes `battleDetail` onto `navStack` so the back button returns to this same battle (via `navigateBack`'s existing stack-pop logic; `DETAIL_FALLBACKS.versusDetail = 'playerDetail'` is only the empty-stack fallback and is unaffected by this change).

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds with no new errors/warnings referencing `App.jsx`.

Manual check (describe, don't run automatically): opening a battle's detail page should show the new "Comparer les joueurs" button above "Supprimer le combat"; tapping it should open the Versus page with that battle's two players already selected, and tapping back should return to the same battle detail page.

---

### Task 4: Add the 4 new derived stats to `calcPlayerStats` in `VersusPage.jsx`

**Files:**
- Modify: `src/components/VersusPage.jsx` (~L277-353)

**Interfaces:**
- Consumes: existing locals inside `calcPlayerStats`: `pb` (player's battles), `myBattlePokemon` (flat list of the player's own Pokémon across `pb`).
- Produces: 4 new fields on the object `calcPlayerStats` returns — `koInflByBattle: number|null`, `koRecuByBattle: number|null`, `distinctPokemonCount: number`, `favoritePokemonInWins: {pokeId, name, count}|null` — consumed by Task 5.

- [ ] **Step 1: Add `distinctPokemonCount` right after `myBattlePokemon` is computed**

Find (~L302-303):
```js
    const myBattlePokemon = pb.flatMap((b) => String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []));

    const typeCounts = new Map();
```
Replace with:
```js
    const myBattlePokemon = pb.flatMap((b) => String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []));
    const distinctPokemonCount = new Set(myBattlePokemon.map((p) => p.pokeId).filter(Boolean)).size;

    const typeCounts = new Map();
```

- [ ] **Step 2: Add `koInflByBattle` / `koRecuByBattle` right after `koRecus` is computed**

Find (~L288-291):
```js
    const koRecus = pb.reduce((sum, b) => {
      const mine = String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []);
      return sum + mine.filter((p) => p.eliminated).length;
    }, 0);
```
Replace with:
```js
    const koRecus = pb.reduce((sum, b) => {
      const mine = String(b.player1) === String(player._id) ? (b.team1 || []) : (b.team2 || []);
      return sum + mine.filter((p) => p.eliminated).length;
    }, 0);
    const koInflByBattle = pb.length > 0 ? Math.round((koInfliges / pb.length) * 10) / 10 : null;
    const koRecuByBattle = pb.length > 0 ? Math.round((koRecus / pb.length) * 10) / 10 : null;
```

- [ ] **Step 3: Add `favoritePokemonInWins` right after `top3` is computed**

Find (~L343-345):
```js
    const top3 = [...pokemonCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    const sorted = sortBattlesAsc(pb);
```
Replace with:
```js
    const top3 = [...pokemonCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    const winPokemonCounts = new Map();
    pb.forEach((b) => {
      const isP1 = String(b.player1) === String(player._id);
      const isWinner = (isP1 && b.winner === 'player1') || (!isP1 && b.winner === 'player2');
      if (!isWinner) return;
      const mine = (isP1 ? b.team1 : b.team2) || [];
      mine.forEach((p) => {
        if (!p?.pokeId) return;
        const cur = winPokemonCounts.get(p.pokeId) || { pokeId: p.pokeId, name: p.name, count: 0 };
        winPokemonCounts.set(p.pokeId, { ...cur, name: p.name || cur.name, count: cur.count + 1 });
      });
    });
    const favoritePokemonInWins = winPokemonCounts.size > 0
      ? [...winPokemonCounts.values()].sort((a, b) => b.count - a.count)[0]
      : null;

    const sorted = sortBattlesAsc(pb);
```

- [ ] **Step 4: Return the 4 new fields**

Find (~L352):
```js
    return { total: pb.length, wins, losses, winRate, koInfliges, koRecus, perfectWins, bestStreak, favoriteFormat, mostUsedTypeEntry, mostUsedPokemon, mvp, top3 };
```
Replace with:
```js
    return { total: pb.length, wins, losses, winRate, koInfliges, koRecus, koInflByBattle, koRecuByBattle, distinctPokemonCount, perfectWins, bestStreak, favoriteFormat, mostUsedTypeEntry, mostUsedPokemon, favoritePokemonInWins, mvp, top3 };
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds with no new errors/warnings referencing `VersusPage.jsx`.

Sanity-check the math by inspection: for a player with 3 battles and 7 total `koInfliges`, `koInflByBattle` should read `2.3` (7/3 rounded to 1 decimal); a player with 0 battles gets `null` for both `koInflByBattle` and `koRecuByBattle` (rendered as `—` per Task 5's `fmt`).

---

### Task 5: Render the 4 new stat rows in the "Face à face" (h2h) block

**Files:**
- Modify: `src/components/VersusPage.jsx` (~L651-689, the `rows` array inside the h2h stats block)

**Interfaces:**
- Consumes: `dateStats1`/`dateStats2` (already in scope in this block, each now carrying the 4 new fields from Task 4); `getPokemonImageUrlStatic` (already imported, used identically for the existing `MVP` row).

- [ ] **Step 1: Insert the new rows**

Find (~L651-689):
```js
                  const rows = [
                    { label: 'Winrate',             v1: dateStats1.winRate,     v2: dateStats2.winRate,     cmp: 'max', fmt: (v) => v != null ? `${v}%` : '—' },
                    { label: 'KO infligés',         v1: dateStats1.koInfliges,  v2: dateStats2.koInfliges,  cmp: 'max', fmt: (v) => v },
                    { label: 'Perfect', v1: dateStats1.perfectWins, v2: dateStats2.perfectWins, cmp: 'max', fmt: (v) => v },
                    { label: 'Meilleure série', v1: dateStats1.bestStreak, v2: dateStats2.bestStreak, cmp: 'max', fmt: (v) => v },
                    {
                      label: 'Type favori',
                      v1: dateStats1.mostUsedTypeEntry?.[0] || null,
                      v2: dateStats2.mostUsedTypeEntry?.[0] || null,
                      cmp: null,
                      render: (typeKey) => typeKey ? (
                        <span className="pl-1 inline-flex items-stretch rounded-full overflow-hidden" style={{ backgroundColor: TYPE_HEX[typeKey] || '#828282' }}>
                          <img src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeKey}.svg`} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">{TYPE_FR[typeKey] || typeKey}</span>
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Format favori',
                      v1: dateStats1.favoriteFormat ? dateStats1.favoriteFormat[0] : null,
                      v2: dateStats2.favoriteFormat ? dateStats2.favoriteFormat[0] : null,
                      cmp: null,
                      render: (fmt) => fmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${fmt === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>{fmt}</span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'MVP',
                      v1: dateStats1.mvp || null,
                      v2: dateStats2.mvp || null,
                      cmp: null,
                      render: (mvp) => mvp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(mvp.pokeId)} alt={mvp.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{mvp.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                  ];
```
Replace with:
```js
                  const rows = [
                    { label: 'Winrate',             v1: dateStats1.winRate,     v2: dateStats2.winRate,     cmp: 'max', fmt: (v) => v != null ? `${v}%` : '—' },
                    { label: 'KO infligés',         v1: dateStats1.koInfliges,  v2: dateStats2.koInfliges,  cmp: 'max', fmt: (v) => v },
                    { label: 'KO infligés / combat', v1: dateStats1.koInflByBattle, v2: dateStats2.koInflByBattle, cmp: 'max', fmt: (v) => v != null ? v : '—' },
                    { label: 'KO reçus / combat',    v1: dateStats1.koRecuByBattle,  v2: dateStats2.koRecuByBattle,  cmp: 'min', fmt: (v) => v != null ? v : '—' },
                    { label: 'Perfect', v1: dateStats1.perfectWins, v2: dateStats2.perfectWins, cmp: 'max', fmt: (v) => v },
                    { label: 'Pokémon joués', v1: dateStats1.distinctPokemonCount, v2: dateStats2.distinctPokemonCount, cmp: 'max', fmt: (v) => v },
                    { label: 'Meilleure série', v1: dateStats1.bestStreak, v2: dateStats2.bestStreak, cmp: 'max', fmt: (v) => v },
                    {
                      label: 'Type favori',
                      v1: dateStats1.mostUsedTypeEntry?.[0] || null,
                      v2: dateStats2.mostUsedTypeEntry?.[0] || null,
                      cmp: null,
                      render: (typeKey) => typeKey ? (
                        <span className="pl-1 inline-flex items-stretch rounded-full overflow-hidden" style={{ backgroundColor: TYPE_HEX[typeKey] || '#828282' }}>
                          <img src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeKey}.svg`} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">{TYPE_FR[typeKey] || typeKey}</span>
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Format favori',
                      v1: dateStats1.favoriteFormat ? dateStats1.favoriteFormat[0] : null,
                      v2: dateStats2.favoriteFormat ? dateStats2.favoriteFormat[0] : null,
                      cmp: null,
                      render: (fmt) => fmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${fmt === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>{fmt}</span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'MVP',
                      v1: dateStats1.mvp || null,
                      v2: dateStats2.mvp || null,
                      cmp: null,
                      render: (mvp) => mvp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(mvp.pokeId)} alt={mvp.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{mvp.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Pokémon favori',
                      v1: dateStats1.favoritePokemonInWins || null,
                      v2: dateStats2.favoritePokemonInWins || null,
                      cmp: null,
                      render: (fav) => fav ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(fav.pokeId)} alt={fav.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{fav.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                  ];
```

Note: the `rows.map(({ label, v1, v2, cmp, fmt, render }, idx, arr) => { ... })` rendering code right after this array (unchanged) already handles both `fmt`-based and `render`-based rows generically — no changes needed there. `key={label}` on each rendered row (in the unchanged map body) requires every label to stay unique, which the 4 new distinct labels above satisfy.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds with no new errors/warnings referencing `VersusPage.jsx`.

---

### Task 6: Render the 4 new stat rows in the "Stats globales" block

**Files:**
- Modify: `src/components/VersusPage.jsx` (~L781-823, the inline array passed to `.map` inside the global stats block)

**Interfaces:**
- Consumes: `stats1`/`stats2` (already in scope in this block, each now carrying the 4 new fields from Task 4); `getPokemonImageUrlStatic`.

- [ ] **Step 1: Insert the new rows**

Find (~L781-823):
```js
                  {[
                    { label: 'Combats joués',       v1: stats1.total,       v2: stats2.total,       cmp: 'max', fmt: (v) => v },
                    { label: 'Victoires',           v1: stats1.wins,        v2: stats2.wins,        cmp: 'max', fmt: (v) => v },
                    { label: 'Défaites',            v1: stats1.losses,      v2: stats2.losses,      cmp: 'min', fmt: (v) => v },
                    { label: 'Winrate',             v1: stats1.winRate,     v2: stats2.winRate,     cmp: 'max', fmt: (v) => v != null ? `${v}%` : '—' },
                    { label: 'KO infligés',         v1: stats1.koInfliges,  v2: stats2.koInfliges,  cmp: 'max', fmt: (v) => v },
                    { label: 'KO reçus',            v1: stats1.koRecus,     v2: stats2.koRecus,     cmp: 'min', fmt: (v) => v },
                    { label: 'Perfect', v1: stats1.perfectWins, v2: stats2.perfectWins, cmp: 'max', fmt: (v) => v },
                    { label: 'Meilleure série', v1: stats1.bestStreak, v2: stats2.bestStreak, cmp: 'max', fmt: (v) => v },
                    {
                      label: 'Type favori',
                      v1: stats1.mostUsedTypeEntry?.[0] || null,
                      v2: stats2.mostUsedTypeEntry?.[0] || null,
                      cmp: null,
                      render: (typeKey) => typeKey ? (
                        <span className="pl-1 inline-flex items-stretch rounded-full overflow-hidden" style={{ backgroundColor: TYPE_HEX[typeKey] || '#828282' }}>
                          <img src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeKey}.svg`} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">{TYPE_FR[typeKey] || typeKey}</span>
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Format favori',
                      v1: stats1.favoriteFormat ? stats1.favoriteFormat[0] : null,
                      v2: stats2.favoriteFormat ? stats2.favoriteFormat[0] : null,
                      cmp: null,
                      render: (fmt) => fmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${fmt === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>{fmt}</span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'MVP',
                      v1: stats1.mvp || null,
                      v2: stats2.mvp || null,
                      cmp: null,
                      render: (mvp) => mvp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(mvp.pokeId)} alt={mvp.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{mvp.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                  ].map(({ label, v1, v2, cmp, fmt, render }, idx, arr) => {
```
Replace with:
```js
                  {[
                    { label: 'Combats joués',       v1: stats1.total,       v2: stats2.total,       cmp: 'max', fmt: (v) => v },
                    { label: 'Victoires',           v1: stats1.wins,        v2: stats2.wins,        cmp: 'max', fmt: (v) => v },
                    { label: 'Défaites',            v1: stats1.losses,      v2: stats2.losses,      cmp: 'min', fmt: (v) => v },
                    { label: 'Winrate',             v1: stats1.winRate,     v2: stats2.winRate,     cmp: 'max', fmt: (v) => v != null ? `${v}%` : '—' },
                    { label: 'KO infligés',         v1: stats1.koInfliges,  v2: stats2.koInfliges,  cmp: 'max', fmt: (v) => v },
                    { label: 'KO infligés / combat', v1: stats1.koInflByBattle, v2: stats2.koInflByBattle, cmp: 'max', fmt: (v) => v != null ? v : '—' },
                    { label: 'KO reçus',            v1: stats1.koRecus,     v2: stats2.koRecus,     cmp: 'min', fmt: (v) => v },
                    { label: 'KO reçus / combat',   v1: stats1.koRecuByBattle,  v2: stats2.koRecuByBattle,  cmp: 'min', fmt: (v) => v != null ? v : '—' },
                    { label: 'Perfect', v1: stats1.perfectWins, v2: stats2.perfectWins, cmp: 'max', fmt: (v) => v },
                    { label: 'Pokémon joués', v1: stats1.distinctPokemonCount, v2: stats2.distinctPokemonCount, cmp: 'max', fmt: (v) => v },
                    { label: 'Meilleure série', v1: stats1.bestStreak, v2: stats2.bestStreak, cmp: 'max', fmt: (v) => v },
                    {
                      label: 'Type favori',
                      v1: stats1.mostUsedTypeEntry?.[0] || null,
                      v2: stats2.mostUsedTypeEntry?.[0] || null,
                      cmp: null,
                      render: (typeKey) => typeKey ? (
                        <span className="pl-1 inline-flex items-stretch rounded-full overflow-hidden" style={{ backgroundColor: TYPE_HEX[typeKey] || '#828282' }}>
                          <img src={`https://cdn.jsdelivr.net/gh/partywhale/pokemon-type-icons@main/icons/${typeKey}.svg`} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          <span className="self-center pr-2 text-[10px] font-bold text-white uppercase leading-none">{TYPE_FR[typeKey] || typeKey}</span>
                        </span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Format favori',
                      v1: stats1.favoriteFormat ? stats1.favoriteFormat[0] : null,
                      v2: stats2.favoriteFormat ? stats2.favoriteFormat[0] : null,
                      cmp: null,
                      render: (fmt) => fmt ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${fmt === '1v1' ? (isDark ? 'bg-purple-300/10 text-purple-300' : 'bg-purple-600/10 text-purple-600') : (isDark ? 'bg-teal-300/10 text-teal-300' : 'bg-teal-600/10 text-teal-600')}`}>{fmt}</span>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'MVP',
                      v1: stats1.mvp || null,
                      v2: stats2.mvp || null,
                      cmp: null,
                      render: (mvp) => mvp ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(mvp.pokeId)} alt={mvp.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{mvp.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                    {
                      label: 'Pokémon favori',
                      v1: stats1.favoritePokemonInWins || null,
                      v2: stats2.favoritePokemonInWins || null,
                      cmp: null,
                      render: (fav) => fav ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <img src={getPokemonImageUrlStatic(fav.pokeId)} alt={fav.name} className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          <span className={`text-xs font-semibold ${t.text} text-center leading-tight`}>{fav.name}</span>
                        </div>
                      ) : <span className={t.textTertiary}>—</span>,
                    },
                  ].map(({ label, v1, v2, cmp, fmt, render }, idx, arr) => {
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds with no new errors/warnings referencing `VersusPage.jsx`.

- [ ] **Step 3: Full-plan sanity pass**

Re-read the edited sections of `BattleDetail.jsx`, `App.jsx`, and `VersusPage.jsx` end to end and confirm: (a) `tr('battles.deleteButton')` / `tr('battles.compareButton')` resolve for all 5 locales (Task 1), (b) the "Comparer les joueurs" button appears above "Supprimer le combat" and is hidden when either player is missing, (c) both the h2h and global stat blocks show all 4 new rows in the order specified, with `—` fallbacks when a player has 0 battles or 0 wins.

---

## Self-review notes

- **Spec coverage:** all 3 spec items covered — compare button + navigation (Tasks 2-3), button rename (Task 2), 4 new stats in both Versus blocks (Tasks 4-6).
- **No placeholders:** every step has literal before/after code; no "add appropriate X" steps.
- **Type/name consistency:** `koInflByBattle`, `koRecuByBattle`, `distinctPokemonCount`, `favoritePokemonInWins` are named identically in Task 4 (produced) and Tasks 5-6 (consumed).
