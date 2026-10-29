# Cold Email v2: Lead Gen Jay–style system (runs on Nick's computer)

Replaces the hand-built Cloudflare + Zapmail plan. Claude Code on Nick's computer does the setup and daily work through tool APIs. Nick approves anything that costs money or sends email.

## The 5 parts

| # | Part | Tool | What Claude Code does | Nick approves |
|---|---|---|---|---|
| 1 | Domains + inboxes | Inbox Insiders + Instantly | Buys ~34 domains, sets DNS, creates ~100 inboxes, loads them into Instantly, starts warm-up | Every purchase |
| 2 | Leads | Apollo + Apify (Google Maps) + ImportYeti, verified with MillionVerifier | Pulls lists A–I, verifies, removes duplicates, scores fit | Which lists to pull |
| 3 | Database | Supabase (free tier) | Stores every company, contact, send and reply (`supabase-schema.sql`) | — |
| 4 | Copy | Claude | Writes campaigns from `customer-playbooks.md`, grades each email against `copy-rubric.md`, rewrites until it passes, makes A/B versions | Final copy before launch |
| 5 | Send + learn | Instantly → HubSpot | Pushes leads and copy to Instantly, logs replies, weekly report: which list, subject and offer get replies | Launch and volume changes |

## Setup (about 1 hour, once)

1. **Install Claude Code desktop** on your computer: https://claude.com/download (sign in with the same account).
2. **Get the repo onto your computer:** in Claude Code, open a new session on the `rulfo` repo, branch `claude/admiring-bell-62bf5m`. Then open the folder `marketing/cold-email-v2`.
3. **Create accounts** (you, in the browser):
   - Inbox Insiders (inboxes). Check price at signup; around $3/mailbox/month is typical for Google inboxes.
   - Instantly (Hypergrowth to start).
   - Supabase (free).
   - Apify (free to start, pay per use).
   - Apollo, MillionVerifier (already planned).
4. **Copy `.env.example` to `.env`** in this folder and paste each API key. `.env` never gets committed (it's in `.gitignore`).
5. **Tell Claude:** "Run setup step 1." It reads `CLAUDE.md` and walks through each step, asking before anything is bought.

## Order of work
1. Infrastructure (day 1) → warm-up 14–21 days.
2. While warming: build Supabase, pull and verify lists, write and grade copy, build the reverse lead magnet (Bay Area vs Reno storage cost check).
3. Week 4: launch at 300/day, then +200/week to 1,000/day.
4. Every Monday: "Run the weekly report."

## Files
- `CLAUDE.md`: rules and workflow Claude follows on your computer
- `.env.example`: list of API keys to fill in
- `supabase-schema.sql`: database tables
- `copy-rubric.md`: the scorecard emails must pass
- Lists: `../reno-outbound-playbook.md` section 4 and `../ideal-customer-profile.md`
- Customer knowledge: `../customer-playbooks.md`
