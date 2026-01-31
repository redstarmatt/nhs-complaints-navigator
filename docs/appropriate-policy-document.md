# Appropriate Policy Document

## Processing of Special Category Data under Schedule 1, Data Protection Act 2018

**Organisation:** [INSERT DATA CONTROLLER NAME]
**Date:** [INSERT DATE]
**Version:** 1.0
**Review date:** [INSERT — must be reviewed regularly]

---

## 1. Purpose

This document is prepared in accordance with Schedule 1, Part 4 of the Data Protection Act 2018 (DPA 2018). It sets out the procedures for securing compliance with the data protection principles in Article 5 UK GDPR and the policies regarding the retention and erasure of special category personal data processed in reliance on conditions in Schedule 1.

---

## 2. Description of Processing

### What special category data is processed?

Complaints Navigator processes the following special category data:

- **Health data** — medical conditions, diagnoses, treatments, hospital visits, GP consultations, mental health conditions, and other health-related information disclosed in complaint narratives
- **Data concerning disabilities** — physical and mental disabilities, learning difficulties, and accessibility needs disclosed by users
- **Safeguarding information** — concerns about abuse or neglect of children or vulnerable adults

This data appears in:
- Conversational intake (user's free-text messages)
- Extracted complaint facts (structured summary)
- Generated complaint letters
- Diary entries (if user includes health details)

### Why is it processed?

The data is processed to help users draft formal complaints against UK public bodies. Health and disability data is inherently part of many complaints (e.g. NHS complaints about medical treatment, DWP complaints about disability benefit assessments, social care complaints).

### Article 9 condition relied upon

**Explicit consent — Article 9(2)(a) UK GDPR**

Users provide explicit consent via an informed consent gate before any data is collected. The consent mechanism:
- Clearly explains that health and disability data will be processed
- Explains that data will be sent to Google's AI service
- Requires affirmative action (ticking checkboxes)
- Is separate from other terms
- Can be withdrawn at any time by deleting all data

---

## 3. Compliance with Article 5 Principles

### Lawfulness, fairness, and transparency (Article 5(1)(a))

- Explicit consent is obtained before processing begins
- A comprehensive privacy notice is provided at the point of data collection
- The privacy notice explains all recipients, purposes, and rights in clear language
- The consent gate is shown on every new visit until consent is granted

### Purpose limitation (Article 5(1)(b))

Special category data is processed solely for the purpose of helping users understand their complaint pathway and drafting complaint text. It is not used for marketing, profiling, research, or any other purpose.

### Data minimisation (Article 5(1)(c))

- Identifiers (NHS numbers, NI numbers) are redacted before being sent to the AI service
- Full conversation history is dropped from stored sessions once structured facts are extracted
- Only data necessary for the specific complaint is collected
- The AI is instructed to ask only relevant questions

### Accuracy (Article 5(1)(d))

- Users review and confirm the extracted summary before it is used
- Users can edit the generated complaint text
- Users can request changes to the summary during the intake conversation

### Storage limitation (Article 5(1)(e))

- Saved sessions are automatically deleted after 30 days of inactivity
- Users can delete individual sessions or all data at any time via the "Delete all my data" function
- The server does not persistently store personal data
- Data sent to the AI service is retained by Google for a limited period per their terms

### Integrity and confidentiality (Article 5(1)(f))

- Data in transit is protected by HTTPS
- Identifiers are redacted before AI processing
- Server error logs are sanitised to strip personal data
- [TO DO: Implement client-side encryption for localStorage]

### Accountability (Article 5(2))

- This appropriate policy document is maintained and reviewed
- A DPIA has been prepared
- Processing records (ROPA) are maintained [TO DO]
- The data controller is registered with the ICO [TO DO]

---

## 4. Retention and Erasure Policy

### Retention periods

| Data location | Retention period | Deletion method |
|---------------|-----------------|-----------------|
| Browser localStorage (sessions) | 30 days from last update, or until user deletes | Automatic purge on app load; manual deletion via "Delete all my data" |
| Browser localStorage (diary entries) | Deleted when parent session expires or is deleted | Automatic with session purge |
| Browser localStorage (consent flag) | Until user deletes all data | Manual deletion |
| Google Gemini API | Limited period per Google's terms (security/compliance monitoring) | Subject to Google's data retention policies |
| Gmail (if email sent) | Indefinite on Gmail servers; indefinite on recipient's server | Outside the app's control — noted in privacy notice |
| Server memory | Duration of request only; not persisted | Automatic (garbage collection) |
| Server logs | [INSERT — per hosting provider's policy] | [INSERT] |
| PDF/DOCX downloads | Indefinite on user's device | User's responsibility |

### Erasure procedures

When a user clicks "Delete all my data":
1. All session data is removed from localStorage
2. All diary entries are removed from localStorage
3. Consent flag is removed (consent gate re-shown)
4. In-memory state is reset

When a data subject exercises their right to erasure:
1. Instruct them to use the "Delete all my data" function for browser-stored data
2. Submit a data deletion request to Google for any data retained by the Gemini API
3. If an email was sent, note that deletion from the recipient's systems is outside our control
4. Document the erasure request and actions taken

---

## 5. Review

This document will be reviewed:
- At least every 12 months
- When processing activities change
- When new categories of special data are processed
- Following any data breach involving special category data

**Signed:** [INSERT]
**Date:** [INSERT]
**Next review:** [INSERT]
