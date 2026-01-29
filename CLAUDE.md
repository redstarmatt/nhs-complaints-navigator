# Public Body Complaints Navigator

## What This Is

An AI-powered tool that helps UK citizens navigate complaints against any public body (NHS, councils, police, DWP, HMRC, schools, etc.). Users describe their experience in a conversational interface, and the tool identifies the correct complaint pathway, generates formal letters, and guides them through the process.

## Tech Stack

- **Frontend**: HTML, CSS, vanilla JavaScript (no frameworks, no build step)
- **Backend**: Node.js + Express (`server.js`) — proxies Gemini API calls
- **AI**: Google Gemini API, called server-side via `GEMINI_API_KEY` env var
- **Hosting**: Railway (Node.js service)

## Project Structure

```
/
├── server.js           # Express backend (serves static files + /api/chat proxy)
├── package.json        # Node dependencies & start script
├── index.html          # Planning/journey-map document (do not modify)
├── app.html            # The working application
├── css/
│   └── style.css       # App styles (mobile-first)
├── js/
│   ├── gemini.js       # Gemini API wrapper (calls /api/chat)
│   ├── chat.js         # Chat UI components
│   ├── intake.js       # System prompts & fact extraction
│   └── router.js       # Pathway routing logic
├── CLAUDE.md           # This file
├── PRD.md              # Product requirements with checkable stories
├── progress.txt        # Learnings tracked across iterations
├── README.md           # Project overview
└── .gitignore
```

## Coding Conventions

- Vanilla JavaScript only, no frameworks or libraries
- Mobile-first CSS with responsive breakpoints
- ES modules (`import`/`export`) for JS files
- Semantic HTML5 elements
- CSS custom properties for theming
- NHS-inspired colour palette (blues, whites, clean)
- Gemini API calls proxied through server (`/api/chat`); API key is a server env var
- Never commit API keys or secrets

## How to Test

1. Set `GEMINI_API_KEY` env var (e.g. `export GEMINI_API_KEY=your-key`)
2. Run `npm start` → opens at `http://localhost:3000/app.html`
3. Click "Start your complaint" and verify the full flow
4. Check the browser console for errors
5. Test on mobile viewport (Chrome DevTools responsive mode)

## Key Decisions

- `index.html` is the original journey map/planning doc — leave it untouched
- `app.html` is the working application
- Express backend proxies Gemini API calls; API key lives server-side as `GEMINI_API_KEY` env var
- Deployed on Railway; set `GEMINI_API_KEY` in Railway environment variables
