# Agent OS: Enterprise Real Estate CRM

Agent OS is a full-stack, enterprise-grade Real Estate CRM and Workflow Engine. Built for high-producing teams, this platform graduates from basic contact management into a legally protective, automated transaction system. 

It tracks leads from their first contact all the way through broker compliance and final closing, utilizing a dynamic database architecture that can adapt to any state's real estate laws without requiring codebase updates.

### Core Architecture & Features:
* **The Databank (Entity Management):** A relational client tracking system with "Find or Create" dynamic tagging, chronological timeline notes, and strict pipeline categorization.
* **The Deal Pipeline (State Machine):** A responsive, drag-and-drop Kanban board that tracks transaction states. Moving a deal to a new stage automatically triggers backend workflow automations.
* **The Automation Engine:** A backend service that calculates and generates time-sensitive, stage-specific tasks (e.g., "Schedule Inspection") to keep agents perfectly on track.
* **Broker Compliance CMS:** A dynamic template engine allowing brokers to create custom, transaction-specific required document checklists (e.g., "Standard AZ Buyer"). 
* **The Deal Instance Cloner:** Applies master templates to specific transactions, creating a localized checklist where agents can upload physical PDF contracts.
* **The Review Feedback Loop:** Features an enterprise-level compliance review flow (Missing, Uploaded, Approved, Rejected) with database-linked rejection notes for rapid correction.

### Tech Stack:
* **Frontend:** React, Vite, Tailwind CSS v4, React Router, Hello-Pangea DND
* **Backend:** Python, FastAPI, Uvicorn
* **Database:** PostgreSQL, SQLAlchemy (ORM), Pydantic (Data Validation)

---

## Development Architecture Log

### Phase 1 Architecture Summary: Foundation & Core Systems

**Database Architecture (PostgreSQL & SQLAlchemy):**
* Engineered the deals pipeline table with strictly enforced stage constraints (Lead, Contact, Appointment, Active, Under Contract, Closed).
* Engineered the tasks table to track and manage agent action items.
* Implemented a self-referential `spouse_id` foreign key in the contacts table to maintain eSignature compliance while gracefully grouping family units.

**The Automation Engine (Python/FastAPI):**
* Built an event-driven automation matrix.
* Configured the API so that patching a Deal's pipeline stage automatically calculates and generates state-specific compliance tasks with mathematically derived due dates.

**Frontend Scaffolding (React + Vite + Tailwind v4):**
* Deployed a modern, lightning-fast frontend layer.
* Configured CORS middleware on the FastAPI backend to allow seamless cross-origin communication on localhost.

**Command Center Dashboard:**
* Built an Optimistic UI component that fetches an agent's active tasks.
* Engineered a two-way toggle system that instantly sorts tasks between "Active" and "Completed Today" while silently syncing to PostgreSQL in the background.

**Opportunity Pipeline (Kanban Board):**
* Integrated `@hello-pangea/dnd` for enterprise-grade drag-and-drop physics.
* Wired the board to the backend so dropping a card into a new column dynamically updates the database and triggers the backend automation engine.

**The Databank (Contact Directory):**
* Constructed a real-time, searchable data table for rendering the contacts database.
* Built an interactive, blurred-background modal form for adding new contacts, featuring an Optimistic UI update that injects the new lead into the table instantly upon submission.

### Phase 2 Architecture Summary: Deep Dives, Automations, & Compliance

**Dynamic Routing & Entity Deep Dives:**
* Engineered dedicated profile views (`/contacts/:id` and `/deals/:id`) combining React Router's `useParams` with bundled SQLAlchemy backend queries.
* Built two-column, tabbed interfaces to view a client's core identity alongside their active transactions and history.
* Wired the application's ecosystem together by making Deals clickable directly from the Contact Profile, routing the user instantly to the Deal Deep-Dive.

**Inline Editing (Optimistic UI):**
* Built PATCH routes in FastAPI using Optional Pydantic schemas (`exclude_unset=True`) to accept partial data updates.
* Engineered state-toggled UI components in React that seamlessly flip static profile cards into editable forms without a page reload.

**The Notes & Timeline Engine:**
* Created a dedicated notes table in PostgreSQL with un-editable `created_at` timestamps for strict compliance tracking.
* Built an interactive chronological feed on the frontend for logging calls and relationship milestones.

**Enterprise "Find or Create" Tagging System:**
* Mapped a Many-to-Many relationship between contacts and tags using an association table.
* Built an intelligent backend route that accepts a string, checks for case-insensitive duplicates, creates the tag if necessary, and links it to the contact in a single database transaction.
* Implemented a native HTML `<datalist>` on the frontend for lightweight, autocomplete tag suggestions.

**Advanced UI/UX Enhancements:**
* **Responsive Pipeline Refactor:** Engineered a tabbed interface separating Buyer and Seller pipelines, utilizing advanced Flexbox scaling (`flex-1 min-w-0`) to eliminate horizontal scrolling.
* **Native Dashboard Calendar:** Built a zero-dependency, pure React and Tailwind grid calendar featuring dynamic date-mapping to visually plot active tasks onto their exact due dates.

**Smart Automation Context:**
* Upgraded the backend pipeline triggers to dynamically append the Deal name to automated tasks (e.g., "Schedule Inspection (123 Main St)").
* Engineered a self-cleaning database function: If a transaction falls out of escrow and reverts stages, the backend automatically hunts down and deletes any future incomplete tasks to prevent database bloat.

**Broker Compliance CMS & Review Loop:**
* Built a native Settings dashboard allowing brokers to create custom, transaction-specific master checklists without altering the codebase.
* Engineered a relational cloning mechanism that generates isolated checklist instances when a template is applied to a specific deal.
* Replaced binary statuses with a rigorous compliance workflow (Missing, Uploaded, Approved, Rejected) featuring a database-linked feedback loop for rejection notes.

### Phase 3 Architecture Summary: Security & Multi-Tenant RBAC

**Authentication & Cryptography:**
* Replaced hardcoded IDs with a robust JWT (JSON Web Token) authentication system.
* Implemented native `bcrypt` password hashing to securely store user credentials in PostgreSQL.
* Built a unified React AuthScreen for seamless Login and Registration.
* Configured Axios interceptors to automatically attach the JWT bearer token to every API request.

**Multi-Tenant Routing (The Invite Engine):**
* Built a dynamic routing engine using `invite_code` relationships.
* Managing Brokers auto-generate a unique, mathematically verified 6-character code upon registration.
* Agents are forced to provide this code during registration, automatically linking them to their Broker's `brokerage_id` in the database.

**Role-Based Access Control (RBAC):**
* Implemented FastAPI dependency injection (The Bouncer) to restrict specific endpoints (like template creation and roster viewing) to the "Broker" role.
* Built conditional UI rendering in React to hide administrative tabs from standard Agents.

**Cross-Entity Automation:**
* Engineered a `db.flush()` sequence so that the moment an Agent registers, they are instantly injected into their Managing Broker's Databank as a Contact.
* The system automatically generates and applies a "Brokerage Agent" tag to these contacts for instant Broker roster filtering.

**The Template Cascade:**
* Upgraded the compliance template API so that Agents automatically inherit and clone the master document checklists built by their specific Managing Broker.

### Phase 4 Architecture Summary: The Great Database Expansion

**Enterprise Database Migration:**
* Executed a structural expansion using raw SQLAlchemy `text()` execution to dynamically inject 15+ new columns across the PostgreSQL database without destroying existing data.
* Upgraded the Databank to track deep relational data critical for referral generation: Birthdays, Anniversaries, Hobbies, Alternate Phones, and Mailing Addresses.
* Expanded the Pipeline to track `financing_type` and explicitly map secondary contacts (`co_client_id`) to transactions.

**Agent Profiles & Settings:**
* Built a new full-stack `/profile` architecture.
* Engineered a React interface for agents to manage public-facing data (Bios, License Numbers, Websites) for future website generation routing.

**The Co-Pilot System (Multi-Agent Deals):**
* Engineered a Many-to-Many `deal_partners` association table in PostgreSQL.
* Unlocked the backend `/roster/` route, allowing team members within the same `brokerage_id` to query their active team.
* Built an interactive UI in the Deal Profile allowing agents to invite specific team members to collaborate on a transaction, laying the groundwork for shared dashboard visibility.

**Advanced Databank Filtering:**
* Bulletproofed the React Contacts component with a multi-filter engine.
* Allows agents to instantly cross-reference text-based searches (Names/Emails) with relational dropdowns (Tags/Categories) to instantly segment their book of business.

### Phase 5 Architecture Summary: Advanced Compliance & Security Hardening

**The Broker Compliance Inbox ("God View"):**
* Engineered a unified dashboard allowing Managing Brokers to view all `Uploaded` (pending) documents across their entire company.
* Built an intelligent backend aggregator route that queries deals, agent info, and document statuses in a single optimized payload.
* Implemented a "Rapid Review" UI, allowing brokers to instantly Approve or Reject documents with inline feedback notes without navigating into individual transaction files.

**Security Hardening (IDOR Prevention):**
* Identified and patched an Insecure Direct Object Reference (IDOR) vulnerability on the transaction endpoints.
* Implemented strict backend RBAC logic so a deal can only be fetched if the requesting user is the Owner, an assigned Co-Pilot, or the Managing Broker.

**Frontend Routing & UX Fixes:**
* Patched a Single Page Application (SPA) "Ghost URL" bug. Engineered the React `AuthProvider` to aggressively intercept logouts, destroy the JWT, and force a React Router redirect to the home path (`/`) to prevent cross-session data leaks.