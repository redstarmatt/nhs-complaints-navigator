# Public Body Complaints Navigator — PRD (Phase 1)

## Vision

Help UK citizens navigate the complaints process for any public body. A conversational AI intake leads to structured fact extraction, pathway routing, and formal letter generation.

## User Stories — Phase 1 Prototype

### Story 1: Landing/Setup Page
- [x] `app.html` with clear value proposition explaining what the tool does
- [x] "Start your complaint" CTA button
- [x] Responsive, clean design using NHS-inspired colour palette
- [x] Settings panel where user enters their Gemini API key
- [x] API key stored in localStorage, never sent to any server except Google's API
- [x] Clear warning about API key handling

### Story 2: Chat UI
- [x] Full-screen chat interface after clicking "Start"
- [x] Message bubbles (user = right, AI = left)
- [x] Text input with send button
- [x] Typing indicator while AI responds
- [x] Auto-scroll to latest message

### Story 3: Gemini API Integration
- [x] `js/gemini.js`: wrapper around Gemini REST API
- [x] Sends conversation history as context
- [x] Handles errors gracefully (rate limits, network issues, invalid key)
- [x] API key read from localStorage

### Story 4: Intake Conversation System Prompt
- [x] `js/intake.js`: system prompt that guides Gemini
- [x] Greet warmly, ask what happened
- [x] Ask clarifying questions naturally (not a form)
- [x] Extract: public body involved, service type, what went wrong, when, severity, desired outcome
- [x] After gathering enough info, summarise back to user for confirmation
- [x] Covers all UK public bodies, not just NHS

### Story 5: Structured Fact Extraction
- [x] After conversation, AI outputs structured JSON with extracted facts
- [x] Display a summary card showing: public body, issue type, timeline, severity, desired outcome
- [x] User can confirm before proceeding

### Story 6: Pathway Routing
- [x] `js/router.js`: determine correct complaint route based on extracted facts
- [x] NHS: Trust PALS -> formal complaint -> PHSO
- [x] GP: practice -> ICB -> PHSO
- [x] Social care: provider -> local authority -> LGSCO
- [x] Police: force -> IOPC
- [x] Schools: school -> local authority -> LGO
- [x] DWP: mandatory reconsideration -> tribunal
- [x] HMRC: complaints process -> Adjudicator -> PHSO
- [x] Council services: council -> LGSCO
- [x] Display recommended pathway with timeline expectations

### Story 7: Letter Generation
- [x] AI generates formal complaint letter from conversation
- [x] Includes: correct recipient info, clear chronology, specific questions, relevant legislation/rights
- [x] User can edit the letter in a text editor
- [x] Copy to clipboard / download as text file

### Story 8: Mobile Responsiveness & Polish
- [x] Entire flow works on mobile
- [x] Loading states and error handling
- [x] Accessible (keyboard nav, screen reader friendly)

## Out of Scope (Phase 1)

- User accounts / login
- Complaint tracking / deadlines
- Response analysis
- Document upload
- Advertising / monetisation
- Backend server
