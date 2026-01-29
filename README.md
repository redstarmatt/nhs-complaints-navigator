# Public Body Complaints Navigator

A free, AI-powered tool to help UK citizens navigate complaints against any public body — NHS, councils, police, DWP, HMRC, schools, social care, and more.

## The Problem

- Written NHS complaints reached record highs in 2024
- Yet 56% of people with poor experiences take no action
- Fewer than 10% make a formal complaint
- Citizens don't know the right route: provider, ICB, NHS England, PHSO, LGSCO, IOPC, tribunal?
- Healthwatch found in 2014 that people found complaints "overly complex, incredibly frustrating and largely ineffective" — a decade later, little has improved
- This applies across all public bodies, not just the NHS

## The Solution

An AI-powered conversational tool that:

1. **Listens** — Conversational intake, not forms. Users describe what happened in their own words.
2. **Diagnoses** — AI determines the right pathway (Trust, ICB, PHSO, LGSCO, IOPC, DWP tribunal, etc.) and flags severity.
3. **Drafts** — Generates properly structured complaint letters with correct recipients, legislation references, and specific questions.

## Supported Public Bodies

- **NHS**: hospitals, trusts, GP surgeries, mental health services, ambulances, dentists
- **Social care**: care homes, home care, local authority social services
- **Councils**: housing, planning, benefits, environmental health
- **Police**: any UK police force
- **Schools**: state schools, academies, local education authority
- **DWP**: Universal Credit, PIP, ESA, JSA, State Pension
- **HMRC**: tax, self-assessment, tax credits
- **Other government**: Home Office, DVLA, Probation, Courts, Prisons, etc.

## How to Use

1. Open `app.html` in your browser
2. Click **Settings** and enter a [Google Gemini API key](https://aistudio.google.com/app/apikey) (free)
3. Click **Start your complaint**
4. Describe what happened in your own words
5. Review the extracted summary and confirm
6. See the recommended complaint pathway
7. Generate a formal complaint letter, edit it, and download

Your API key is stored locally in your browser only and sent only to Google's Gemini API.

## Tech Stack

- Static HTML/CSS/JavaScript — no build step, no frameworks
- Google Gemini API (called directly from the browser)
- Mobile-first responsive design

## Project Structure

```
├── index.html          # Journey map (planning document)
├── app.html            # The working application
├── css/
│   └── style.css       # App styles
├── js/
│   ├── gemini.js       # Gemini API wrapper
│   ├── chat.js         # Chat UI & application controller
│   ├── intake.js       # System prompts & fact extraction
│   └── router.js       # Pathway routing logic
├── CLAUDE.md           # AI coding context
├── PRD.md              # Product requirements
├── progress.txt        # Iteration learnings
└── README.md           # This file
```

## Roadmap

- [x] Landing page with value proposition
- [x] Conversational intake prototype
- [x] Pathway routing logic
- [x] Letter generation
- [ ] Complaint tracker with deadlines
- [ ] Response analysis feature
- [ ] Ombudsman submission assistant
- [ ] Document upload and summarisation

## Ethical Guardrails

- **Clear disclaimers**: AI guidance, not legal advice
- **Free alternatives**: Always signposts free advocacy services
- **Privacy**: No data stored on any server; API key in localStorage only
- **Accessible**: Keyboard navigation, screen reader support, mobile-first

## License

MIT

## Author

Built by someone who knows the complaints system inside out.
