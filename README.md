# AwardWatch

A directory of design competition deadlines, built with Next.js (App Router) and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

Competitions live in [`data/competitions.json`](data/competitions.json) — a flat JSON array, no database. Each entry follows the `Competition` type in [`src/lib/types.ts`](src/lib/types.ts):

```
title, organizer, deadline, category, targetAudience, studentTag,
country, entryFee, registrationUrl, prizeMoney, resultDate,
shortDescription, longDescription, submissionFormat, status, slug
```

`status` (`open` / `closing-soon` / `expired`) is a maintained field, not computed at build time — when a competition's deadline passes, update its `status` rather than deleting the entry, so it stays archived and indexable at `/competitions/[slug]`.

`category` must be one of the six fixed categories in `CATEGORIES` (`src/lib/types.ts`). `studentTag: true` marks entries that should also surface under the cross-cutting "Student" filter.

## Pages

- `/` — fullscreen hero slider (soonest non-expired deadlines) + a filterable grid of all competitions.
- `/competitions/[slug]` — statically generated detail page per competition.

## Deploying

This is a standard Next.js app — deploy directly on [Vercel](https://vercel.com/new).
