# 3 Sanjorn Sonsamphan — Buddy–Budder

Web app for the Buddy–Budder activity at the three-faculty camp (Engineering,
Science, Pharmacy) at Chulalongkorn University.

Participants sign in with their university Google account, register, and on
announcement night each sees the **buddy** they will look after. The person
looking after *them* — their **budder** — stays anonymous behind two hints.

Next.js (App Router) · TypeScript · Tailwind · Supabase · Vercel. All UI copy
is Thai.

---

## Try it locally, without a Google account

You need Docker running (for the local Supabase) and Node 20+.

```bash
npm install
npx supabase start          # first run pulls a few images; prints your keys
cp .env.example .env.local  # then paste those keys in — see below
npm run seed -- --phase=revealed
npm run dev
```

`npx supabase start` prints an `API URL`, an `anon key` and a `service_role
key`. Put them in `.env.local`, and add the line that turns the demo on:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
CRON_SECRET=anything-for-local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ALLOW_DEMO_LOGIN=1
```

Then open **http://localhost:3000/demo** and tap any name to sign in as them.
The first person in the list is an admin, so `/admin` works too.

> The demo sign-in exists only for this. It sits behind two independent gates —
> never in a production build, and only when `ALLOW_DEMO_LOGIN` is set — and
> when either fails both `/demo` and `/auth/demo` answer **404**. It can only
> reach accounts the seed created, because an account that arrived through
> Google has no password to match.

### Showing a different stage

```bash
npm run seed -- --phase=before     # registration has not opened
npm run seed -- --phase=open       # registration open, no match yet
npm run seed -- --phase=closed     # registration shut, draft match to check
npm run seed -- --phase=revealed   # match confirmed, reveal already passed
```

Other options: `--count=120` (2–500), `--reset` (wipe first), `--seed=123`
(reproducible roster). The seed refuses to run against anything that is not a
local Supabase, because it creates shared-password accounts and can delete
every profile.

---

## Setting up the real thing

### 1. Create the Supabase project

Create a project at [supabase.com](https://supabase.com). From **Project
Settings → API** you need the **Project URL**, the **anon** key and the
**service_role** key.

### 2. Push the migrations

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This creates the tables, every Row Level Security policy, the reveal function,
the admin functions and the cron job, and inserts the default schedule:

| | Asia/Bangkok |
|---|---|
| registration opens | 2026-10-30 00:00 |
| registration closes (and the match is drawn) | 2026-11-06 23:59 |
| buddy announced (and hint 1 opens) | 2026-11-07 18:00 |
| hint 2 opens | not set — admins choose |

Admins can change all four later on `/admin`.

> `20261027000600_cron_schedule.sql` needs the `pg_cron` and `pg_net`
> extensions. Supabase provides both; if the push complains, enable them under
> **Database → Extensions** and push again.

### 3. Create the Google OAuth client

In the [Google Cloud console](https://console.cloud.google.com) → **APIs &
Services → Credentials → Create credentials → OAuth client ID → Web
application**:

- **Authorised redirect URI**:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`

That URI is Supabase's, not the app's — Google returns to Supabase, which then
returns to the app.

Then in Supabase → **Authentication → Providers → Google**: enable it and paste
the client ID and secret.

And in Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add both
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

The app asks Google for `hd=student.chula.ac.th`, which narrows the account
chooser. That is a hint and nothing more, so the domain is checked again on the
server — see [Security](#security).

### 4. Environment variables

| Variable | Where | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | everywhere | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everywhere | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | service_role key. Bypasses RLS — never prefix it with `NEXT_PUBLIC_` |
| `CRON_SECRET` | server only | Long random string; the auto-match endpoint checks it |
| `NEXT_PUBLIC_SITE_URL` | everywhere | `https://your-app.vercel.app`. Set it in production so a forwarded host cannot redirect sign-in elsewhere |

Local-only, all optional and all ignored in a production build:

| Variable | What it does |
|---|---|
| `ALLOW_DEMO_LOGIN=1` | Turns on `/demo` and the seeded password sign-in |
| `DEMO_NOW` | Pretends the server clock is elsewhere, e.g. `2026-11-07T18:00:00+07:00` |
| `ALLOW_TIME_TRAVEL=1` | Lets `DEMO_NOW` work in a production build. Only for a throwaway staging deploy |

`.env.example` lists all of them.

### 5. Deploy to Vercel

Import the repository, set the five environment variables above in **Settings →
Environment Variables**, and deploy. Then set `NEXT_PUBLIC_SITE_URL` to the real
domain and redeploy, so OAuth redirects point at it.

### 6. Add an admin

Admins are an email allowlist. In the Supabase **SQL Editor**:

```sql
insert into public.admins (email, note)
values ('6730012321@student.chula.ac.th', 'Pim, registration lead');
```

The address must be the one they sign in with. `/admin` and every admin API
check this server-side, and so does every `admin_*` function in the database.

### 7. Point the cron job at the deployment

The match is drawn automatically when registration closes. Tell the database
where to call, in the **SQL Editor**:

```sql
update public.cron_config
set match_url   = 'https://your-app.vercel.app/api/cron/match',
    cron_secret = '<the same value as CRON_SECRET>'
where id = 1;
```

Saving this schedules the job immediately. Check it:

```sql
select jobname, schedule from cron.job;
```

The schedule is in **UTC**, so a 23:59 Bangkok close time reads as `59 16 …`.
Changing the close time on `/admin` moves the job automatically — there is only
ever one. The secret is read from `cron_config` when the job fires rather than
copied into the job body.

The endpoint is idempotent: if a match run already exists it does nothing, so a
duplicate fire, a retry, or an admin who already drew one by hand all leave the
existing match alone.

---

## How it works

### Phases

All four come from the **server clock** against the stored schedule; nothing
reads the visitor's device.

1. **Before open** — login only, registration blocked.
2. **Open** — register, and edit everything on `/profile`.
3. **Closed** — no new registrations. Prefix, student ID, faculty and year stop
   being editable while the team checks the draft match.
4. **Revealed** — `/home` shows the buddy, once `reveal_at` has passed **and** a
   run is confirmed.

### Faculty

Never chosen. It is derived from the last two digits of the student ID — `21`
Engineering, `23` Science, `33` Pharmacy — by a trigger, and a CHECK constraint
makes a row whose faculty disagrees with its student ID impossible to write.
Any other code is rejected at registration.

### Matching

`lib/matching.ts` arranges everyone into **one cycle** A → B → C → … → A, where
X → Y means X is Y's budder. Everyone is exactly one budder and one buddy, for
any n ≥ 2.

- **Hard**: a budder and their buddy are in different faculties.
- **Soft**: prefer นาย ↔ นางสาว links; links involving ไม่ระบุ are neutral;
  same-gender links are avoided.

People are grouped by faculty, the groups ordered largest first, and laid into
the even positions and then the odd ones — which puts cycle neighbours at least
⌊n/2⌋ apart in that sequence. A same-faculty link is therefore only possible
when one faculty holds more than half the roster, which is exactly when no
valid cycle exists. Local search then improves the gender mix with swap and
2-opt moves, never accepting a move that breaks the hard constraint.

If the hard constraint genuinely cannot be met, the result carries the
fewest-possible same-faculty links and names them, and `/admin` shows a warning
above the stats.

The module is pure — no I/O, no clock, no `Math.random` — so a run is
reproducible from the seed stored on it.

### Security

The domain rule is enforced at four independent layers, because the first is
only a hint:

1. `hd=student.chula.ac.th` is passed to Google.
2. The OAuth callback checks the verified email and signs the session straight
   back out if it is from anywhere else.
3. The middleware rechecks on every request and clears the cookies.
4. `profiles` refuses a row whose email is not the student ID at that domain.

On privacy:

- Every table has RLS. A participant reads and writes **only their own**
  profile row.
- `match_runs`, `assignments` and `admins` have RLS on with **no policy at
  all**, and their privileges revoked from the browser roles. They cannot be
  reached from a session by any route.
- The only path to reveal data is `public.get_home_view()`, a security-definer
  function returning a fixed shape. The buddy comes back without their student
  ID. The budder is read by a query that selects their two hint columns and
  nothing else, so **their identity never enters a variable, let alone a
  response**.
- Hint 2 stays in the database until `hint2_at` has passed.
- Admins reach the matching tables the same way, through `admin_*` functions
  that check the allowlist themselves. The admin page needs no service-role key.

---

## Tests

```bash
npm test          # everything
npm run typecheck
```

Most tests are pure and need nothing. The database tests run the real
migrations against a throwaway Postgres:

```bash
npm run db:up     # starts it on port 55432
npm test
npm run db:down
```

Without it they **skip with a message** rather than fail, so `npm test` works
on a machine with no Docker.

> This is a *second*, separate database from `npx supabase start`. The test
> harness drops the whole public schema on every run, so it refuses to connect
> to anything that is not localhost.

What is covered: the matcher (n = 2, 3, 7, 60, 300, lopsided faculties,
all-ไม่ระบุ, single-gender, impossible rosters, reproducibility, and that every
result is one single cycle); every RLS policy from both an allowed and a denied
angle; the reveal privacy rules; the registration and lock rules; the admin
functions; CSV and search; dates and phases.

**Not covered by the suite**: Google OAuth itself, and
`20261027000600_cron_schedule.sql`, which needs `pg_cron` and `pg_net` — a
plain Postgres has neither. Both are verified by hand against a real instance.

---

## Layout

```
app/                 routes: / /register /home /profile /admin, auth and api
components/ui/       primitives shared by every screen
components/forms/    the registration and profile fieldsets
lib/
  matching.ts        the cycle algorithm — pure, heavily tested
  phase.ts           server-clock phase resolution
  faculty.ts         student ID → faculty, Thai labels, colours
  registration.ts    the write rules, as pure functions
  home.ts            the reveal payload
  admin.ts           admin data loading
  supabase/          server, browser and service-role clients
supabase/migrations/ schema, RLS, reveal, admin, cron
supabase/seed/       the local seed script
tests/               unit and database tests
```

Design tokens live in `tailwind.config.ts` — every colour, radius and shadow
from the approved mockups, so no component carries a hex value.
