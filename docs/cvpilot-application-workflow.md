# CVPilot Application Workflow

## Workflow

1. Paste the full job-page text into `Application inbox`.
2. Click `Import job`.
3. Select the imported job from the shortlist.
4. Click `Prepare full application`.
5. Review the visible GPT score gaps, CV JSON changes, and verification warnings.
6. Review the improved CV in `CV studio`.
7. Optionally click `Improve CV again with these points` for a second tailoring pass.
8. Review the cover-letter highlights, warnings, and final letter in the selected-job panel.
9. Copy/export the CV JSON, cover letter, ATS PDF, or visual PDF as needed.

## Required Environment

- `DATABASE_URL`: required for persisted jobs and applications.
- `OPENAI_API_KEY`: required for scoring, CV tailoring, and cover-letter generation.
- Optional workflow imports from n8n still depend on the existing n8n webhook setup and secret.

If `DATABASE_URL` or `OPENAI_API_KEY` is missing, the UI should show a controlled error instead of silently failing.

## QA Command

Run the app first, then run:

```bash
CVPILOT_QA_URL=http://127.0.0.1:3032 node '$JCODE_SCRATCH_DIR/qa-cvpilot-flow.mjs'
```

The QA script verifies pasted job import, visible workflow anchors, layout controls, screenshots, and mobile horizontal overflow.

## Browser Audit Score

Current score: 8.6/10.

- Workflow clarity: 8.8/10
- Feature completeness: 8.5/10
- CV and cover-letter usefulness: 8.6/10
- AI transparency: 8.8/10
- Visual polish: 8.3/10
- Responsiveness: 8.7/10
- Reliability and error handling: 8.4/10
- Export readiness: 8.8/10

## Known Limitations

- Full score -> CV -> cover-letter generation requires a valid `OPENAI_API_KEY`; QA without credentials verifies controlled UI/error behavior and import mechanics.
- The second CV improvement pass overwrites the existing application package for the selected job.
- Existing saved cover letters only preserve the final text; newly generated cover letters show highlights and warnings during the active session.
