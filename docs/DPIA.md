# Data Protection Impact Assessment (DPIA)

## Complaints Navigator

**Date:** [INSERT DATE]
**Version:** 1.0
**Completed by:** [INSERT NAME]
**Reviewed by:** [INSERT NAME]
**Status:** Draft — requires review before processing begins

---

## 1. Description of Processing

### What is the project?

Complaints Navigator is a web application that helps UK citizens draft formal complaints against public bodies (NHS, councils, police, DWP, HMRC, schools, and others). It uses a conversational AI interface to gather complaint details, identify the correct complaints pathway, and generate complaint text.

### What personal data is processed?

| Category | Examples | Special category? |
|----------|---------|-------------------|
| Complaint narrative | Free-text description of what happened | May contain health/disability data |
| Health data | Medical conditions, diagnoses, treatments, mental health | Yes (Article 9) |
| Disability data | Physical/mental disabilities, accessibility needs | Yes (Article 9) |
| Identifiers | NHS number, NI number, claim references, crime references | No (but high sensitivity) |
| Names | Complainant name (in letter), staff names, third-party names | No |
| Location | UK postcode | No |
| Vulnerability data | Safeguarding concerns, reasonable adjustments needed | May be special category |
| Contact preference | Email, phone, or letter | No |
| Diary entries | Dates, notes on complaint progress | May contain sensitive data |

### How is data collected?

- Users type complaint details into a chat interface
- An AI extracts structured facts from the conversation
- Users may optionally provide their postcode
- Users create diary entries manually

### Who are the data subjects?

- UK citizens making complaints (adults aged 18+)
- Third parties mentioned in complaints (staff, family members, patients)
- Children may be subjects of complaints (e.g. school complaints, safeguarding)

### How many data subjects?

[INSERT EXPECTED VOLUME]

### Data flows

```
User browser
  → Express server (no persistent storage)
    → Google Gemini AI API (conversation processing)
    → Postcodes.io (postcode only)
    → UK Parliament API (postcode only)
    → Gmail SMTP (complaint letter, if user chooses email)
  → Browser localStorage (sessions, diary entries)
  → Downloaded files (PDF/DOCX on user's device)
```

### Retention periods

- Browser localStorage: auto-deleted after 30 days of inactivity; user can delete at any time
- Server: no persistent storage of personal data
- Google Gemini API: retained for a limited period per Google's terms (security/compliance)
- Email: stored by Gmail and recipient mail server (outside app's control)
- PDF/DOCX downloads: stored on user's device (outside app's control)

---

## 2. Necessity and Proportionality

### What is the lawful basis?

- **Article 6(1)(a):** Explicit consent — obtained via a consent gate before any data is collected
- **Article 9(2)(a):** Explicit consent for special category data — included in the consent gate

### Is the processing necessary?

Yes. The core function of the tool requires understanding the complaint details to identify the correct pathway and generate appropriate complaint text. The AI processing is necessary to provide the conversational interface and generate draft text.

### Data minimisation measures

- Identifiers (NHS numbers, NI numbers) are redacted before being sent to the AI API; they are reinserted locally in the final letter
- Full conversation history is dropped from stored sessions once facts are extracted; only the structured summary is retained
- Sessions auto-expire after 30 days
- Postcode is only sent to lookup services if the user provides one

### Could the objective be achieved with less data?

The complaint narrative inherently requires personal and potentially special category data. However:
- [CONSIDER] Whether the AI could process anonymised summaries rather than full narratives
- [CONSIDER] Whether identifiers could be fully excluded from AI processing (currently redacted)
- [CONSIDER] Whether conversation history could be deleted sooner

---

## 3. Risks to Individuals

### Risk 1: Special category data sent to third-party AI service

| | |
|---|---|
| **Likelihood** | Certain (by design) |
| **Severity** | High |
| **Risk** | Health, disability, and mental health data is processed by Google's Gemini AI. If Google's systems are breached, or if data is used contrary to terms, sensitive personal data could be exposed. |
| **Mitigation** | Use paid Gemini API tier or Vertex AI with Data Processing Addendum. Redact identifiers before sending. Google's UK-specific terms apply paid-tier protections to UK users. Monitor Google's compliance with DPA. |
| **Residual risk** | Medium |

### Risk 2: Plaintext data in browser localStorage

| | |
|---|---|
| **Likelihood** | Possible |
| **Severity** | High |
| **Risk** | If a user's device is compromised, shared, or left unlocked, all saved complaint data is accessible in plaintext. |
| **Mitigation** | Auto-expiry after 30 days. Data minimisation (only extracted facts stored, not full conversation). User can delete all data. [TO DO: Implement client-side encryption.] |
| **Residual risk** | Medium-High (until encryption implemented) |

### Risk 3: Users may believe the tool has reported a crime or made a safeguarding referral

| | |
|---|---|
| **Likelihood** | Possible |
| **Severity** | Critical (could result in harm if a report is not made) |
| **Risk** | Users may confuse the complaint process with crime reporting or safeguarding. The AI previously made false claims about reporting to authorities. |
| **Mitigation** | AI system prompt explicitly prohibits claiming to take action. Safeguarding gate blocks complaint processing for serious crimes/safeguarding concerns and directs to police/safeguarding services. Consent gate requires users to confirm they understand the tool does not make reports. |
| **Residual risk** | Low |

### Risk 4: Children's data in complaints

| | |
|---|---|
| **Likelihood** | Likely (school complaints, NHS paediatric complaints, safeguarding) |
| **Severity** | High |
| **Risk** | Complaints about schools, NHS treatment of children, or child safeguarding will necessarily include children's personal data. |
| **Mitigation** | Age gate requires users to confirm they are 18+ or a parent/guardian. Service is designed for adults. Children's data within complaint narratives is subject to the same protections as all other data. [TO DO: Full Children's Code assessment.] |
| **Residual risk** | Medium |

### Risk 5: International transfer to Google

| | |
|---|---|
| **Likelihood** | Certain |
| **Severity** | Medium |
| **Risk** | Data may be processed outside the UK on Google's infrastructure. |
| **Mitigation** | Google's Cloud Data Processing Addendum includes UK SCCs and UK-US Data Bridge. Google is certified under the UK Extension to the EU-US Data Privacy Framework. [TO DO: Accept CDPA in Google Cloud console.] |
| **Residual risk** | Low |

### Risk 6: Email transmission of complaint letters

| | |
|---|---|
| **Likelihood** | When user chooses to send by email |
| **Severity** | Medium |
| **Risk** | Complaint letter containing personal and health data is sent via email (unencrypted at application layer) through Gmail SMTP. Data stored on Gmail servers and recipient's mail server. |
| **Mitigation** | Email sending is optional — user can download and submit manually instead. [TO DO: Review Gmail SMTP processor arrangement — consider Google Workspace or dedicated transactional email service.] |
| **Residual risk** | Medium |

---

## 4. Consultation

### Has the DPO been consulted?

[INSERT — if you have a DPO]

### Have data subjects been consulted?

[INSERT — user research / testing feedback]

### Is ICO consultation required?

If residual risks remain high after mitigation, the ICO must be consulted before processing begins (Article 36 UK GDPR). Based on this assessment, ICO consultation is recommended if client-side encryption (#16) and the paid Gemini tier (#11) are not implemented before launch.

---

## 5. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Data Controller | [INSERT] | [INSERT] | |
| DPO (if applicable) | [INSERT] | [INSERT] | |
| Technical Lead | [INSERT] | [INSERT] | |

---

## 6. Review Schedule

This DPIA must be reviewed:
- Before launch
- When processing changes significantly
- Every 12 months
- If a data breach occurs

**Next review date:** [INSERT]
