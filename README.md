# jllb-CRM-SaaS (2026)
S*p*b*s* M******xx3!

# JLLB CRM | Premium SaaS CRM Solution

A high-density, multi-tenant Customer Relationship Management (CRM) platform engineered for modern agencies. This application transitions flat data grids into a fluid, relational business command center, enabling teams to manage clients, track project budgets, log time-sensitive tasks, and monitor financial variance metrics side-by-side in real time.

## 🚀 Main Functionality & Features

* **Interactive Visual Command Center (Dashboard):** Provides executives and project managers with high-level business analytics, including accumulated revenue tracking, total logged hours, active project health, and automated budget risk watchlists (notifying teams when projects creep past 90%+ of their allocated cap).
* **Context-Retaining Split-Screen View (50/50 Panels):** Seamless UX utilizing side-by-side sliding detail drawers. Clicking a row in the Client Grid slides open a 50% viewport panel showing that specific client's projects. Similarly, clicking a project opens an inline task-auditing sub-dashboard.
* **Deep Inline Editing & Relational Recalculation:** Supports double-click inline cell modifications across spreadsheet grids and detail panels. Saving hourly logs or adjusting task structures triggers instant, client-side dynamic rollups of total actual hours and operational costs across the primary project views.
* **Temporal Tracking & Advanced Multi-Status Filtering:** Full lifecycle tracking via custom Project Start/End dates and Task execution records. Spreadsheets feature custom multi-choice checkbox popovers allowing users to filter by single or multiple project/task statuses simultaneously.
* **Collaborative Security Boundary & Auditing:** Built with robust Row-Level Security (RLS) paradigms allowing universal visibility for team alignment, while restricting critical data mutation actions (deletion) exclusively to admins or the original creator. A background auditing space captures platform operations for absolute accountability.

---

## 🛠️ Tech Stack

### Frontend & UI Layer
* **Framework:** Next.js (App Router) — Providing optimal server-side rendering, routing stability, and API speed.
* **Language:** TypeScript — Enforcing end-to-end type safety across data payloads, component states, and relational models.
* **Styling & UI Kit:** Tailwind CSS + Shadcn UI — Powering a high-density, cohesive, modern dark-themed interface built with fully responsive layout grids.
* **Icons:** Lucide React — Clean, scalable vector action assets.

### Backend, Database & Security
* **Database Engine:** PostgreSQL — Robust object-relational database structure handling complex cross-table relational links.
* **BaaS Platform:** Supabase — Managing real-time data streaming, relational schemas, and direct frontend connections.
* **Authentication & Access Control:** Supabase Auth — Secure multi-tenant session management.
* **Data Security:** PostgreSQL Row-Level Security (RLS) — Server-enforced programmatic access tokens protecting corporate boundaries.
* **Auditing Layer:** Pl/pgSQL Triggers — Low-latency PostgreSQL event listeners capturing data mutations cleanly.

---

## 📂 Project Structure Highlights

```text
├── src/
│   ├── app/
│   │   ├── clients/       # Clients Grid table & split-screen drawer logic
│   │   ├── dashboard/     # Financial analytics charts & date filters
│   │   ├── projects/      # Projects Grid, status filters & rollup math
│   │   └── tasks/         # Tasks Grid, time-tracking inputs & sorting
│   ├── components/        # Slide-out detail panels & editable cell controls
│   └── utils/             # Database connectivity & application logger utils
