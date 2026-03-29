# MREA Agent OS: Enterprise Real Estate CRM

Agent OS is a full-stack, enterprise-grade Real Estate CRM and Workflow Engine. Built to the specifications of the Millionaire Real Estate Agent (MREA) model, this platform graduates from basic contact management into a legally protective, automated transaction system. 

It tracks leads from their first contact all the way through broker compliance and final closing, utilizing a dynamic database architecture that can adapt to any state's real estate laws without requiring codebase updates.

### Core Architecture & Features:
* **The Databank (Entity Management):** A relational client tracking system with "Find or Create" dynamic tagging, chronological timeline notes, and MREA-strict categorization.
* **The Deal Pipeline (State Machine):** A responsive, drag-and-drop Kanban board that tracks transaction states. Moving a deal to a new stage automatically triggers backend workflow automations.
* **The Automation Engine:** A backend service that calculates and generates time-sensitive, stage-specific tasks (e.g., "Schedule Inspection") to keep agents perfectly on track.
* **Broker Compliance CMS:** A dynamic template engine allowing brokers to create custom, transaction-specific required document checklists (e.g., "Standard AZ Buyer"). 
* **The Deal Instance Cloner:** Applies master templates to specific transactions, creating a localized checklist where agents can upload physical PDF contracts.
* **The Review Feedback Loop:** Features a Keller Williams-style compliance review flow (Missing, Uploaded, Approved, Rejected) with database-linked MCA rejection notes.

### Tech Stack:
* **Frontend:** React, Vite, Tailwind CSS v4, React Router, Hello-Pangea DND
* **Backend:** Python, FastAPI, Uvicorn
* **Database:** PostgreSQL, SQLAlchemy (ORM), Pydantic (Data Validation)

---

## Development Log

Day 1 Architecture & Feature Summary: Agent OS

Database Architecture (PostgreSQL & SQLAlchemy):

Engineered the deals pipeline table with stage constraints (Lead, Contact, Appointment, Active, Under Contract, Closed).

Engineered the tasks table to store agent to-do items.

Implemented a self-referential spouse_id foreign key in the contacts table to maintain eSignature compliance while grouping family units.

The Automation Engine (Python/FastAPI):

Built an event-driven automation matrix in services.py.

Configured the API so that patching a Deal's pipeline stage automatically calculates and generates state-specific compliance tasks with mathematically derived due dates.

Frontend Scaffolding (React + Vite + Tailwind v4):

Deployed a modern, lightning-fast frontend layer.

Configured CORS middleware on the FastAPI backend to allow seamless cross-origin communication on localhost.

Command Center Dashboard:

Built an Optimistic UI component that fetches an agent's active tasks.

Engineered a two-way toggle system that instantly sorts tasks between "Active" and "Completed Today" while silently syncing to PostgreSQL in the background.

Opportunity Pipeline (Kanban Board):

Integrated @hello-pangea/dnd for enterprise-grade drag-and-drop physics.

Wired the board to the backend so dropping a card into a new column updates the database and triggers the backend automation engine.

The Databank (Contact Directory):

Constructed a real-time, searchable data table for rendering the contacts database.

Built an interactive, blurred-background modal form for adding new contacts, featuring an Optimistic UI update that injects the new lead into the table instantly upon submission.

Day 2.1 Architecture Summary: The Deep Dive
The Contact Profile Deep-Dive (Dynamic Routing):

Engineered a dedicated profile view (/contacts/:id) combining React Router's useParams with a bundled SQLAlchemy backend query.

Built a two-column, tabbed interface to view a client's core identity alongside their active transactions.

Inline Contact Editing (The "U" in CRUD):

Built a PATCH route in FastAPI to accept partial data updates (exclude_unset=True).

Engineered a state-toggled UI component in React that seamlessly flips a static profile card into an editable form without a page reload.

The Notes & Timeline Engine:

Created a dedicated notes table in PostgreSQL with un-editable created_at timestamps for compliance tracking.

Built an interactive chronological feed on the frontend for logging calls and relationship milestones.

Enterprise "Find or Create" Tagging System:

Mapped a Many-to-Many relationship between contacts and tags using an association table.

Built an intelligent backend route that accepts a string, checks for case-insensitive duplicates, creates the tag if necessary, and links it to the contact in a single database transaction.

Implemented a native HTML <datalist> on the frontend for lightweight, autocomplete tag suggestions.

Native Pipeline Creation:

Upgraded the Kanban board with a modular popup form that securely fetches existing contacts for dropdown selection and instantly injects new Deals into the database.

Day 2.2 Architecture Summary: The Pipeline & Deal Engine
Responsive Pipeline Refactor:

Engineered a tabbed interface to separate Buyer and Seller pipelines.

Implemented advanced Flexbox scaling (flex-1 min-w-0) to ensure the Kanban board dynamically squeezes to fit any monitor size, entirely eliminating horizontal scrolling.

The Deal Deep-Dive (/deals/:id):

Built a highly efficient relational GET route in FastAPI that bundles a transaction, its associated client, and its compliance tasks into a single payload.

Constructed a dedicated Deal Profile UI to view transaction details, client contact info, and manage the task checklist.

Inline Transaction Editing:

Created an Optional Pydantic schema and PATCH route for partial deal updates.

Built a state-toggled form on the frontend to instantly update Financials (Commission, Value) and Close Dates without a page refresh.

Cross-Entity Navigation:

Wired the application's ecosystem together by making Deals clickable directly from the Contact Profile, routing the user instantly to the Deal Deep-Dive.

Day 2.3 Architecture Summary: Command Center Calendar & Automation Cleanup
Native Dashboard Calendar: * Built a zero-dependency, pure React and Tailwind CSS grid calendar.

Engineered dynamic date-mapping to visually plot active tasks onto their exact due dates directly within the Command Center.

Smart Automation Context (services.py): * Upgraded the backend pipeline triggers to dynamically append the Deal name to automated tasks (e.g., "Schedule Inspection (123 Main St)"), ensuring instant identification on the dashboard.

Pipeline Reversion Logic: * Engineered a self-cleaning database function that maps pipeline stages to numerical indices.

If a transaction falls out of escrow and moves backward in the pipeline, the backend automatically hunts down and deletes any future incomplete tasks to prevent database bloat.

Day 2.4 Architecture Summary: Broker Compliance & Workflow Engine
Dynamic Template CMS: * Built a native Settings dashboard allowing brokers to create custom, transaction-specific master checklists (e.g., "Standard AZ Buyer") without altering the codebase.

The Deal Instance Engine: * Engineered a relational backend cloning mechanism. When a template is applied to a transaction, the API generates a localized, isolated instance of the checklist specifically for that deal.

Enterprise Review Loop: * Replaced binary statuses with a Keller Williams-style compliance workflow (Missing, Uploaded, Approved, Rejected).

Integrated a database-level feedback loop, allowing reviewers to attach specific text notes to rejected documents (e.g., "Missing initials on page 2") for rapid correction.

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