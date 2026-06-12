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

## Scripts

- `npm run dev` - start the local development server
- `npm run build` - create a production build
- `npm run start` - start the production server
- `npm run lint` - run linting
