# Cursor Build Prompt — Salesperson **TASKS** & Call Workflow

You are building in **Next.js 14 (App Router, TypeScript)** with **Tailwind**, **shadcn/ui**, and **lucide-react**. Data layer: **Neon Postgres via Drizzle ORM** for leads/tasks/events and **MongoDB** (existing) for users & sales. **Reuse the existing “Add Sale” form** when a lead is marked *Converted*.

---

## Goal

Implement a new **TASKS** menu in the Salesperson dashboard with an end‑to‑end **call flow**: show due calls, today’s tasks (follow‑ups first, then new leads), start a call via `tel:` link, auto‑track call duration using Page Visibility/Focus, and on return show an **Outcome dialog** that updates lead status, logs the call, and optionally creates a follow‑up task or opens the existing Add Sale form.

---

## UX Overview (Routing & Layout)

- Add **/dashboard/tasks** (Salesperson only) and a left‑nav item **TASKS** (lucide icon: `ListTodo`).
- Structure the page in three stacked sections:
  1. **Due Calls (Yesterday)** — calls that were due yesterday and remain incomplete.
  2. **Today’s Tasks**
     - **Follow‑up Leads** (top)
     - **New Leads** (below)
  3. (Optional) Empty state tips if no items.
- Each list item shows: lead name, phone, source/status chips, most recent note, **Call** button on the right (lucide `Phone` icon). Call button uses `tel:` to trigger the device dialer.
- Clicking **Call**: starts a timer **immediately**; when the user returns to the tab (visibility becomes `visible` or window gains `focus`), stop timer and show **Outcome Dialog**.

---

## Flow Diagram (Mermaid)

```mermaid
flowchart TD
  A[Open /dashboard/tasks] --> B{Sections}
  B --> C[Due Calls (yesterday)]
  B --> D[Today's Tasks]
  D --> D1[Follow-up Leads]
  D --> D2[New Leads]

  C -->|Click Call| E(Start timer)
  D1 -->|Click Call| E
  D2 -->|Click Call| E

  E --> F[Open tel: dialer]
  F --> G[User returns to page]
  G --> H[Stop timer]
  H --> I[Open Outcome Dialog]

  I --> J{Call completed?}
  J -->|No| K[Textarea: reason]
  J -->|Yes| L{Lead qualified?}
  L -->|No| M[Textarea: reason]
  L -->|Yes| N[Dropdown: Current status]

  N -->|Converted| O[Open existing Add Sale form]
  N -->|Send in WhatsApp| P[Save status + notes]
  N -->|Not interested| Q[Save status + notes]
  N -->|Need follow-up| R[Show Follow-up form]

  R --> S[Create/Update follow-up task]
  O --> T[Persist sale + update lead]
  P --> U[Persist call log + update lead]
  Q --> U
  S --> U
```

---

## Data Model (Drizzle / Postgres)

Use/extend the existing tables. Implement **migrations** if fields are missing.

### 1) `leads` (existing)

- Ensure indexes on `(assigned_to)`, `(created_at)`, `(status)`, `(next_follow_up_at)` if present.

### 2) `tasks`

Add/ensure fields to support follow-up and call tasks:

- `id` (pk), `lead_id` (fk → leads.id), `assigned_to_user_id` (fk → users.id or string),
- `type` enum: `CALL` | `FOLLOW_UP` | `OTHER`
- `title` (text), `notes` (text),
- `due_at` (timestamptz), `completed_at` (timestamptz, nullable),
- `status` enum: `PENDING` | `DONE` | `SKIPPED`,
- `priority` enum: `LOW` | `MEDIUM` | `HIGH` (optional),
- `created_at`, `updated_at`.

### 3) `call_logs` (NEW)

Create to record each dial attempt and outcome:

- `id` (pk), `lead_id` (fk), `salesperson_id` (fk), `phone` (text),
- `started_at` (timestamptz), `ended_at` (timestamptz), `duration_ms` (int),
- `completed` (boolean), `qualified` (boolean | null),
- `status` enum: `CONVERTED` | `SEND_WHATSAPP` | `NOT_INTERESTED` | `NEED_FOLLOW_UP` | `NONE`,
- `notes` (text), `created_at`.

### 4) `lead_events` (existing)

Append new event types: `CALL_STARTED`, `CALL_ENDED`, `CALL_OUTCOME_RECORDED`, `LEAD_STATUS_CHANGED`, `FOLLOW_UP_CREATED`, `SALE_CREATED`.

> If you already have similar fields/tables, map to them; otherwise create migrations accordingly.

---

## Server API (App Router handlers)

Create the following routes (POST/GET). All endpoints validate input with **zod** and enforce auth (Salesperson must own the lead):

- `GET /api/tasks/due-calls` → Returns yesterday’s due call tasks for the current salesperson.

  - **Definition**: tasks where `type = 'CALL'` and `due_at < today 00:00` and `completed_at IS NULL` and `assigned_to_user_id = session.user.id`.

- `GET /api/tasks/today` → Returns today’s tasks segmented into `{ followUps: TaskWithLead[], newLeads: Lead[] }`.

  - **followUps**: tasks with `type='FOLLOW_UP'` where `date_trunc('day', due_at) = today` and assigned to current user; only incomplete.
  - **newLeads**: leads assigned to current user with `date_trunc('day', assigned_at) = today` (or `created_at`, depending on your model) and not yet contacted.

- `POST /api/calls/start` → body `{ leadId, phone }` → creates `call_logs` row; adds `lead_events: CALL_STARTED`.

- `POST /api/calls/end` → body `{ callLogId }` → stamps `ended_at`, computes `duration_ms`; adds `lead_events: CALL_ENDED`.

- `POST /api/calls/outcome` → body `{ callLogId, completed, qualified, status, notes, followUp?: { dueAt, product, name } }`

  - Writes outcome to `call_logs`.
  - If `status = 'NEED_FOLLOW_UP'` create/patch a `tasks` row (`type='FOLLOW_UP'`) for the same lead with `due_at` and carry `notes`.
  - If `status = 'CONVERTED'` update lead status and return a redirect target to the existing Add Sale form (with query string prefill).
  - Adds `lead_events: CALL_OUTCOME_RECORDED` and `LEAD_STATUS_CHANGED` when applicable.

> Keep pure, idempotent handlers; return JSON. Add rate limits and error handling.

---

## Frontend Components

Use **shadcn/ui** (Dialog, Tabs, Card, Button, Badge, Select, Input, Textarea, Popover/Calendar for datetime). Icons from **lucide-react**.

### 1) Route: `/dashboard/tasks/page.tsx`

- Server component wrapper → fetch lists via `GET /api/tasks/due-calls` and `GET /api/tasks/today`.
- Render three sections:
  - **Due Calls (Yesterday)** → `<TasksList variant="due" />`
  - **Today’s Tasks**
    - **Follow‑up Leads** → `<TasksList variant="followups" />`
    - **New Leads** → `<LeadList variant="new" />`

### 2) `LeadListItem` & `TasksListItem`

- Props include lead/task info.
- Right‑side **Call** button:
  - `<a href={`tel:\${phone}`}>` with `onClick={startCall(lead)}`; also render a secondary **End Call** button (hidden until call is in progress) for desktop fallback.

### 3) `useCallTimer` hook (client)

- Handles timer lifecycle:
  - `start(leadId, phone)`: POST `/api/calls/start`; store `callLogId` and `startedAt`.
  - Listen to `visibilitychange` and `focus` events:
    - When `document.visibilityState === 'visible'` OR window gains `focus` **and** a call is active → POST `/api/calls/end` and open Outcome Dialog.
  - Provide `endNow()` for manual termination.
- Expose: `{ isCalling, elapsedMs, start, endNow, callLogId }`.

### 4) `OutcomeDialog`

- Opens after timer ends. Shows a duration badge categorized:
  - `< 5 min`, `< 10 min`, `≥ 10 min` based on `elapsedMs`.
- **Form logic** (if/else):
  - Q1: **“Does the call completed?”** → boolean (Yes/No).
    - If **No** → show **Remark** textarea only.
    - If **Yes** → Q2: **“Is the lead qualified?”** (Yes/No)
      - If **No** → **Remark** textarea.
      - If **Yes** → **Current Status** (Select):
        - `Converted`, `Send in WhatsApp`, `Not interested`, `Need follow‑up`.
        - If `Converted` → on submit, call `/api/calls/outcome` then **redirect** to existing **Add Sale** form, passing prefill query (lead id, name, phone).
        - If `Need follow‑up` → reveal Follow‑up sub‑form (below) before submit.
- **Prefill** lead details read‑only at top.
- Submit calls `POST /api/calls/outcome`.

### 5) `FollowUpSubform` (visible when status = Need follow‑up)

- Fields: `phone` (read‑only, auto‑set), `name` (prefill from lead), `product_enquired` (text), `follow_up_at` (datetime), `remark` (textarea).
- On submit, server creates a `FOLLOW_UP` task with `due_at = follow_up_at` and copies notes.

---

## Example Implementation Snippets

> **Note:** Pseudocode-ish TypeScript for structure; implement with your project’s utility wrappers.

**Hook: **``

```ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useCallTimer() {
  const [isCalling, setIsCalling] = useState(false)
  const [callLogId, setCallLogId] = useState<string | null>(null)
  const startTsRef = useRef<number | null>(null)

  const start = useCallback(async (leadId: string, phone: string) => {
    const res = await fetch('/api/calls/start', { method: 'POST', body: JSON.stringify({ leadId, phone }) })
    const data = await res.json()
    setCallLogId(data.callLogId)
    startTsRef.current = Date.now()
    setIsCalling(true)
  }, [])

  const finish = useCallback(async () => {
    if (!isCalling || !callLogId) return
    await fetch('/api/calls/end', { method: 'POST', body: JSON.stringify({ callLogId }) })
    setIsCalling(false)
  }, [isCalling, callLogId])

  useEffect(() => {
    const onReturn = () => { if (isCalling) finish() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [isCalling, finish])

  return { isCalling, callLogId, start, endNow: finish }
}
```

**Call Button usage**

```tsx
<Button asChild onClick={() => start(lead.id, lead.phone)}>
  <a href={`tel:${lead.phone}`} aria-label={`Call ${lead.name}`}>Call</a>
</Button>
// Also render an End Call button if isCalling: <Button variant="secondary" onClick={endNow}>End Call</Button>
```

---

## Query Logic (SQL‑ish)

**Due Calls (Yesterday)**

```sql
SELECT t.*, l.name, l.phone, l.source
FROM tasks t
JOIN leads l ON l.id = t.lead_id
WHERE t.type = 'CALL'
  AND t.assigned_to_user_id = $userId
  AND t.completed_at IS NULL
  AND t.due_at < date_trunc('day', now());
```

**Today’s Follow‑ups**

```sql
SELECT t.*, l.name, l.phone
FROM tasks t
JOIN leads l ON l.id = t.lead_id
WHERE t.type = 'FOLLOW_UP'
  AND t.assigned_to_user_id = $userId
  AND t.completed_at IS NULL
  AND date_trunc('day', t.due_at) = date_trunc('day', now());
```

**Today’s New Leads**

```sql
SELECT l.*
FROM leads l
WHERE l.assigned_to = $userId
  AND date_trunc('day', l.assigned_at) = date_trunc('day', now())
  AND l.first_contacted_at IS NULL;  -- or your equivalent flag
```

---

## UI & Design Details

- Use shadcn components: `Card`, `CardHeader`, `CardContent`, `Tabs`, `Dialog`, `Badge`, `Select`, `Input`, `Textarea`, `Button`, `Popover` + `Calendar`.
- Icons: `ListTodo` (menu), `Phone` (call), `Timer`, `MessageSquare` (WhatsApp), `UserCheck` (converted), `XCircle` (not interested), `AlarmClock` (follow-up).
- Duration badge colors (Tailwind):
  - `< 5 min` → `bg-emerald-100 text-emerald-700`
  - `< 10 min` → `bg-amber-100 text-amber-700`
  - `≥ 10 min` → `bg-blue-100 text-blue-700`
- Respect reduced‑motion; add `sr-only` labels for a11y.

---

## Behavior & Edge Cases

- **Auto‑stop timer** relies on Page Visibility/Focus. On desktop (where `tel:` may not change visibility), show **End Call** button as fallback.
- If the user bounces back too quickly (< 2s), ignore and keep timer running until focus has lasted > 800ms.
- Prevent double submits with loading states. Handle network errors gracefully.
- When `Converted`, after `/api/calls/outcome` → navigate to the **existing Add Sale** form route with prefilled query (e.g., `/dashboard/sales/new?leadId=...&name=...&phone=...`).
- When `Need follow‑up`, create/update a `FOLLOW_UP` task; also update `leads.next_follow_up_at` if that column exists.

---

## Acceptance Criteria (Must Pass)

1. **Navigation**: A **TASKS** menu appears for Salesperson role and links to `/dashboard/tasks`.
2. **Lists**: Due Calls (yesterday), Today → Follow‑ups, Today → New Leads render with correct counts.
3. **Call Flow**: Clicking **Call** starts a timer, opens the dialer via `tel:`, and upon return auto‑opens Outcome Dialog.
4. **Duration**: Outcome Dialog shows one of `< 5 min`, `< 10 min`, `≥ 10 min` badges based on measured duration.
5. **Outcome Logic**: Form respects the if/else rules; saves to DB, updates lead status, and logs `call_logs` + `lead_events`.
6. **Converted**: Redirects to existing Add Sale form with prefilled data; upon save, the sale is persisted in Mongo (existing feature) and lead is updated.
7. **Need follow‑up**: Creates a `FOLLOW_UP` task with correct `due_at` and links it to the lead.
8. **Resilience**: Manual **End Call** button works when visibility events do not fire.
9. **Security**: Only the assigned salesperson can see/edit their tasks and record outcomes.

---

## Implementation Checklist (Cursor Tasks)

-

---

## Notes for Integration

- Use your existing user session to scope queries by `assigned_to_user_id`.
- Respect your existing **sales Add form**; do not duplicate it.
- Emit `lead_events` for analytics/auditing.
- Keep functions pure; keep client components minimal and push data logic to server.

> Deliver production‑ready code following this spec. Keep styles minimal and consistent with the app’s design system.

