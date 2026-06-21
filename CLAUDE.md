# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Type-check with tsc, then Vite production build
npm run preview  # Serve the production build locally
```

There are no tests in this project.

## Architecture

This is a standalone React + TypeScript + Vite single-page app for splitting bills among a fixed group of friends. It is extracted from the desktop-app repo and deployed to GitHub Pages at `https://judyhuang8.github.io/bill-split/`.

The `base: '/bill-split/'` in `vite.config.ts` is required so asset URLs resolve correctly under the GitHub Pages sub-path.

### Structure

Everything lives under `src/components/calculator/`, split into focused modules. `App.tsx` is a thin wrapper that renders `<BillSplitter />` directly — there is no routing.

- **`types.ts`** — domain types (`FriendName`, `FRIENDS`, `LineItem`, `Activity`) and summary types (`SummaryTerm`, `DebtRow`, `CreditSection`).
- **`calc.ts`** — pure logic, no JSX: `blankActivity`, `blankLineItem`, `calcShares`, `activityTotal`, `fmt`, `activityLabel`, `calcSummaryData`, `summaryTermStr`, `formatTextDump`.
- **`share.ts`** — pure logic for snapshot links: `encodeActivities` / `decodeActivities` round-trip the `Activity[]` through UTF-8-safe, URL-safe base64.
- **`BillSplitter.tsx`** — thin orchestrator: holds `activities`/`editing`/`expandedIds`/`copied`/`showExport` state and the save/edit/delete/share/new-bill handlers, renders the nav and layout, and composes the components below.
- **`ActivityCard.tsx`** — one expandable activity row in the list; computes its own shares/total via `calc.ts`.
- **`SummarySection.tsx`** — the bottom "Summary" debt-settlement block.
- **`ActivityModal.tsx`** — the add/edit modal (owns the emoji picker and line-item editing).
- **`TextExportModal.tsx`** — read-only modal showing the `formatTextDump` output in a selectable textarea with a Copy button.
- **`bill-splitter.css`** — the shared stylesheet, imported once in `BillSplitter.tsx`.

### Data model

- **Activity** — a single expense event: name, emoji, who paid (`paidBy`), split mode (`flat` or `detailed`), participants, and a flat cost or list of line items.
- **LineItem** — a sub-item within a detailed activity: description, cost, and which friends share it (`assignedTo`).
- `FriendName` is a union type of the six fixed friends: `'Judy' | 'Cheng' | 'Jeffrey' | 'Vicky' | 'Mike' | 'Will'`. To add or remove friends, update the `FRIENDS` array and `FriendName` type in `types.ts`.

### Split logic

- **Flat mode** — total cost divided evenly among selected participants.
- **Detailed mode** — each line item's cost is divided among its `assignedTo` members; per-person totals are summed across all items.

`calcShares(activity)` (in `calc.ts`) returns a `Partial<Record<FriendName, number>>` — only people who owe something appear as keys.

### Summary / debt settlement

`calcSummaryData(activities)` (in `calc.ts`) builds a ledger of who owes whom across all activities, then nets opposing debts so each pair appears only once. It returns `CreditSection[]`, which drives the `SummarySection` component at the bottom of the page.

Debt labels differ by mode:
- **Flat** — the activity name is used as the label (e.g. `12.50(dinner)`).
- **Detailed** — each line item gets its own debt entry labeled with `item.description` (e.g. `5.00(pasta) + 7.50(wine)`), so the breakdown shows per-item granularity rather than a single activity total.

### Persistence & sharing (snapshot links)

There is no backend — GitHub Pages is static hosting. State lives only in React; to share, the app encodes the current `activities` into the URL's **hash fragment** (`#data=…`):

- **Share button** — `BillSplitter.shareLink()` builds `origin + pathname + '#data=' + encodeActivities(activities)`, copies it to the clipboard via `navigator.clipboard`, and briefly flips the label to "Copied!" (the `copied` state). Disabled when there are no activities.
- **Load on open** — `loadFromHash()` (in `BillSplitter.tsx`) reads `window.location.hash`, and the `activities` state is lazily initialized from it, so opening a shared link hydrates the list with no flash. Malformed payloads decode to `null` and fall back to an empty page.
- **New Bill button** — `newBill()` clears `activities`/`expandedIds` and wipes the hash via `history.replaceState` so a refresh stays empty.

This is a **snapshot**, not live sync: the link captures state at copy-time. Only `activities` are encoded — the summary and per-person shares are always recomputed on the fly from the decoded activities. `encodeActivities`/`decodeActivities` live in `share.ts` and use built-in `TextEncoder`/`btoa` (no new dependency); the hash fragment is used (not a query string) so it never hits a server and GitHub Pages routing is untouched.

### Text export (copy for group chat)

The **Copy Text** button opens `TextExportModal`, which displays `formatTextDump(activities, creditSections)` (in `calc.ts`) — a Discord/markdown-style plain-text dump to paste into a group chat. Each activity becomes a `**{emoji} {name} Total: ${total} {emoji}**` block with a `*{paidBy} Paid*` line; flat activities show a `total/n = $per per person` formula and one `> person: **$amount**` line each, while detailed activities show each person's per-line-item shares joined with `+` (e.g. `> Mike: 8.58+19.31=**$27.89**`). The summary renders `**💵 Total Pay Back {creditor} 💵**` blocks with `> ✅ {debtor}: {terms} = **$net**` rows (or `✅ Everyone is settled up!`). Output uses **literal emoji** and full friend names; `summaryTermStr` is the shared helper that builds the `amount(label)` term strings for both `SummarySection` and the dump.

### Emoji picker

Activity emojis are chosen via `emoji-picker-react` (v4). In `ActivityModal`, clicking the emoji button opens a floating `<EmojiPicker>` popup with search and categories. The picker is dismissed on emoji selection or click-outside. The `emoji-picker-react` package is the only runtime dependency added beyond React itself.

### Styling

Plain CSS only (`bill-splitter.css`) — no Tailwind. All selectors are scoped under `.split-page` to avoid collisions. The stylesheet is imported once in `BillSplitter.tsx` and shared by every component. The `.modal-overlay`/`.modal` classes (`position: fixed; inset: 0`) are shared by both `ActivityModal.tsx` and `TextExportModal.tsx`.
