# Custom CV Builder

TypeScript-based CV builder for creating structured, customizable resume templates.

## What I Built

- A CV editing interface for working with structured resume sections
- Reusable components for editing, previewing, and organizing CV content
- A JSON editor backed by a resume schema for more controlled data editing
- AI-assisted panels for improving resume content and tailoring applications

## Why I Built It

Tailoring a CV for different jobs is repetitive and easy to make inconsistent.
I built this project to explore how structured resume data, reusable templates, and AI-assisted suggestions can make the application workflow clearer, faster, and easier to improve over time.

## Related Project

- [JobsAutomation](https://github.com/gauravaroracs/JobsAutomation) - companion automation project for job application workflows

## Features

- Resume editor with structured CV sections
- Live preview for reviewing layout and content changes
- JSON editor backed by a resume schema
- AI panel for generating and improving CV content
- Quick apply workflow for tailoring applications
- Cover letter generator and editor tied to the current CV and job description

## Tech Stack

- TypeScript
- Next.js
- React
- Tailwind CSS
- Monaco Editor
- OpenAI API
- Cursor / AI-assisted development

## Repository Layout

- `src/app` - Next.js routes and API handlers
- `src/components` - reusable UI panels and editors
- `src/lib` - data transforms, schema helpers, and storage logic
- `src/types` - shared TypeScript types
- `src/data/sampleResume.ts` - starter resume seed data
- `storage/cvpilot` - local file-backed CV storage used by the app
- `automation/JobsAutomation` - exported n8n workflow bundle and notes

## What I Learned

- How to model resume data with TypeScript types and schemas
- How to design reusable editing components for structured content
- How AI suggestions can support a real user workflow when paired with human review
- How to manage editor state, preview state, and application structure in a Next.js project

## Next Improvements

- Add screenshots and a short demo flow to the README
- Improve template export options for PDF or document workflows
- Add richer cover letter export formats
- Add more validation and clearer error states for resume data
- Refine the AI workflow for job-specific CV tailoring

## How to Run

```bash
npm install
npm run dev
```

The development server runs on `http://127.0.0.1:3030`.

Production deployment

CVPilot is deployed on Railway. Set `DATABASE_URL`, `OPENAI_API_KEY`, and the
n8n variables in Railway's environment settings. For durable file-backed CV
storage, mount a Railway volume and set `CVPILOT_STORAGE_DIR` to its absolute
mount path; otherwise the default is `storage/cvpilot` inside the app directory.

### Unified job application MVP

The application inbox is backed by Postgres. Set `DATABASE_URL` and
`N8N_WEBHOOK_SECRET` in `.env.local`, start the Next.js app, and configure the
n8n discovery workflow to `POST` each accepted job to:

`http://127.0.0.1:3030/api/integrations/n8n/jobs`

Send the secret in the `x-cvpilot-webhook-secret` header. The accepted payload
uses the existing n8n fields, including `job_id`, `company`, `role`,
`job_description`, `job_url`, `match_score`, `priority`, `why_good`, and `risk`.
The app creates the database tables automatically on the first request.

For application-status mirroring, set `N8N_SHEET_SYNC_WEBHOOK_URL` to an n8n
webhook that updates the matching Google Sheets row by `job_id`.

The inbox supports Best fit, Newest, and Oldest sorting. The n8n discovery button
starts the workflow configured by `N8N_DISCOVERY_WEBHOOK_URL`; that workflow
should asynchronously POST scored jobs back to the CVPilot ingestion endpoint.
The Codex discovery button uses the OpenAI Responses web-search tool to find
current specific listings and imports them without assigning a score. Existing
n8n scores are preserved by the job upsert path. Keep these provider boundaries
when adding product features such as plans, usage limits, or billing later.

You can also paste a complete public job-page URL into the inbox. CVPilot
extracts the structured job posting and page text, imports the role without
scoring it, then prepares a tailored CV and cover letter when a Master CV is
available. Pages that require login or render the description only in the
browser may need to be imported through the n8n workflow instead.

## Scripts

- `npm run dev` - start the local development server
- `npm run build` - create a production build
- `npm run start` - start the production server
- `npm run lint` - run linting
