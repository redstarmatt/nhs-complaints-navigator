# NHS Complaints Navigator

A free, AI-powered tool to help UK citizens navigate the NHS and public service complaints maze.

## The Problem

- Written NHS complaints reached record highs in 2024
- Yet 56% of people with poor experiences take no action
- Fewer than 10% make a formal complaint
- Citizens don't know whether to complain to: provider, ICB, NHS England, PHSO, CQC, professional regulators, or Local Government Ombudsman
- Healthwatch found in 2014 people found complaints "overly complex, incredibly frustrating and largely ineffective" — a decade later, little has improved

## The Solution

An AI-powered tool that:

1. **Listens** — Conversational intake, not forms. Users describe what happened in their own words.
2. **Diagnoses** — AI determines the right pathway (Trust, ICB, PHSO, LGSCO, GMC, etc.) and flags severity.
3. **Drafts** — Generates properly structured complaint letters with correct recipients, NHS Constitution references, and specific questions.
4. **Tracks** — Monitors deadlines, sends reminders, generates chaser letters.
5. **Interprets** — Analyses responses in plain English, identifies gaps, recommends next steps.
6. **Escalates** — Prepares Ombudsman submissions when local resolution fails.
7. **Summarises** — Analyses medical records and complex documents.

## Business Model

100% free to use. Monetised through:

- **Display advertising** — Private healthcare, insurance (£3-8 CPM)
- **Solicitor referrals** — Clinical negligence firms pay £75-300 per qualified lead
- **Service affiliates** — Patient advocacy, counselling, insurance (£20-80 per conversion)

### Revenue Projections

| Monthly Users | Estimated Revenue |
|---------------|-------------------|
| 10,000 | £4-8k |
| 50,000 | £20-40k |

## User Journey

See [index.html](index.html) for the complete user journey map with AI features and revenue opportunities at each stage.

## Tech Stack (Planned)

- **Frontend**: Next.js / React
- **AI**: Claude API for conversation, letter generation, document analysis
- **Database**: PostgreSQL (user accounts, complaint tracking)
- **Auth**: Simple email-based (optional account creation)
- **Hosting**: Vercel / Railway

## Key Features

### Phase 1: Conversational Intake
User describes their experience naturally. AI extracts:
- Service type (GP, hospital, mental health, social care)
- What went wrong
- When it happened
- Severity indicators
- Desired outcome

### Phase 2: Smart Routing
AI recommends the correct pathway:
- NHS Trust → PALS → Complaints → PHSO
- GP → Practice or ICB
- Social care → Provider → Local authority → LGSCO
- Professional conduct → GMC/NMC/HCPC

### Phase 3: Letter Generation
One-click complaint letter with:
- Correct recipient (looked up automatically)
- Formal but accessible tone
- Clear chronology
- Specific questions to answer
- NHS Constitution rights referenced

### Phase 4: Response Analysis
User uploads response, AI provides:
- Plain English summary
- Verdict (upheld/partially/not upheld)
- Gap analysis (questions not answered)
- Next steps recommendation

### Phase 5: Escalation Support
For unresolved complaints:
- PHSO/LGSCO submission preparation
- Document checklist
- Strongest grounds identified
- Realistic expectations set

## Ethical Guardrails

- **Vulnerable audience**: Ads must be helpful, not exploitative
- **Solicitor vetting**: Only SRA-regulated firms with verified track records
- **Clear disclaimers**: AI guidance, not legal advice
- **Free alternatives**: Always signpost free NHS advocacy services
- **Privacy**: Documents processed transiently, not stored
- **No dark patterns**: Tool is useful without clicking ads

## Roadmap

- [ ] Landing page with value proposition
- [ ] Conversational intake prototype
- [ ] Pathway routing logic
- [ ] Letter generation templates
- [ ] Basic complaint tracker
- [ ] Response analysis feature
- [ ] PHSO submission assistant
- [ ] Document upload and summarisation
- [ ] Ad integration
- [ ] Solicitor referral partnerships

## Contributing

This is currently a concept/planning stage project. Contributions welcome once development begins.

## License

MIT

## Author

Built by someone who knows the complaints system inside out.
