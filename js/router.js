// Pathway routing logic
// Determines the correct complaint route based on extracted facts
// Enriched with real UK public body form data: time limits, pre-requirements,
// evidence guidance, warnings, acknowledgment timelines, escalation triggers

/**
 * @typedef {Object} PathwayStep
 * @property {string} name - Step name
 * @property {string} description - What to do at this step
 * @property {string} timeline - Expected timeline
 * @property {boolean} [current] - Whether this is the recommended starting point
 * @property {string|null} [contactEmail] - Complaints email address
 * @property {string|null} [portalUrl] - Online complaint form URL
 * @property {string|null} [postalAddress] - Mailing address template
 * @property {string} [acknowledgmentTimeline] - Expected acknowledgment time
 * @property {string} [escalationTrigger] - What allows moving to next step
 * @property {string[]} [infoNeeded] - Specific information the body requires
 */

/**
 * @typedef {Object} Pathway
 * @property {string} title - Pathway title
 * @property {string} description - Brief explanation
 * @property {string} timeLimit - Time limit summary
 * @property {string} timeLimitDetail - Expanded time limit explanation
 * @property {string[]} preRequirements - Things that must happen before formal complaint
 * @property {string[]} evidenceGuidance - What evidence to gather
 * @property {string[]} warnings - Critical warnings
 * @property {PathwayStep[]} steps - Ordered steps
 * @property {string[]} tips - Useful tips
 * @property {string} legislation - Relevant legislation/rights
 */

const PATHWAYS = {
  nhs_trust: {
    title: 'NHS Hospital/Trust Complaint',
    description: 'Complaints about care received at an NHS hospital or trust.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The NHS complaints regulations set a 12-month time limit from the date of the event, or from the date you first became aware of the matter. The trust can extend this if there are good reasons and it is still possible to investigate.',
    preRequirements: [
      'Consider contacting PALS first for informal resolution — many issues can be resolved quickly this way',
      'If you want a formal investigation, you can skip PALS and go straight to a written complaint'
    ],
    evidenceGuidance: [
      'Dates of appointments, admissions, and discharges',
      'Names of staff involved (doctors, nurses, consultants) if known',
      'Ward or department name',
      'NHS number (found on appointment letters or your GP record)',
      'Copies of any correspondence (letters, discharge summaries)',
      'Photographs of injuries or conditions if relevant',
      'Names of any witnesses',
      'A timeline of events in your own words'
    ],
    warnings: [],
    steps: [
      {
        name: 'PALS (Patient Advice & Liaison Service)',
        description: 'Contact the hospital\'s PALS team for informal resolution. They can often resolve issues quickly without a formal complaint.',
        timeline: 'Usually responds within a few days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhs.uk/nhs-services/hospitals/what-is-pals-patient-advice-and-liaison-service/',
        postalAddress: '[Hospital Name] PALS, [Hospital Address]',
        acknowledgmentTimeline: 'Same day or next working day',
        escalationTrigger: 'If PALS cannot resolve your concern, or you want a formal investigation',
        infoNeeded: [
          'Your name and contact details',
          'NHS number if available',
          'Brief description of your concern',
          'Dates and department involved'
        ]
      },
      {
        name: 'Formal Complaint to the Trust',
        description: 'Write a formal complaint to the trust\'s complaints department. They must acknowledge within 3 working days and agree a response timescale with you.',
        timeline: 'Response within 6 months (often 25-40 working days)',
        contactEmail: null,
        portalUrl: 'https://www.nhs.uk/nhs-services/hospitals/',
        postalAddress: 'Complaints Department, [Trust Name], [Trust Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the trust\'s final response',
        infoNeeded: [
          'Full name and contact details',
          'NHS number',
          'Date(s) of treatment or events',
          'Ward, department, or clinic name',
          'Names of staff involved if known',
          'Clear description of what went wrong',
          'How it affected you',
          'What outcome you want (e.g. apology, explanation, change in practice)',
          'Whether you are complaining on behalf of someone else (include their consent)'
        ]
      },
      {
        name: 'Parliamentary and Health Service Ombudsman (PHSO)',
        description: 'If unhappy with the trust\'s response, escalate to the PHSO. They investigate independently and can recommend remedies.',
        timeline: 'Investigation can take 6-12 months',
        contactEmail: 'phso.enquiries@ombudsman.org.uk',
        portalUrl: 'https://www.ombudsman.org.uk/making-complaint',
        postalAddress: 'Parliamentary and Health Service Ombudsman, Millbank Tower, Millbank, London SW1P 4QP',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PHSO is the final stage — their decisions can be challenged only by judicial review',
        infoNeeded: [
          'Copy of the trust\'s final complaint response',
          'Your account of what happened and why you are unhappy with the response',
          'How the situation has affected you personally (emotionally, physically, financially)',
          'What you want the PHSO to achieve',
          'Consent form if complaining on behalf of someone else'
        ]
      }
    ],
    tips: [
      'You have 12 months from the event (or awareness) to make a formal complaint',
      'You can complain to the trust and CQC simultaneously',
      'Consider contacting your local Healthwatch for free advocacy support',
      'If there\'s a professional conduct issue, you can also report to the GMC (doctors), NMC (nurses), or HCPC (other professionals)',
      'Keep copies of everything you send and receive'
    ],
    legislation: 'NHS Constitution, Local Authority Social Services and NHS Complaints Regulations 2009'
  },

  gp: {
    title: 'GP Surgery Complaint',
    description: 'Complaints about care from your GP surgery or a specific GP.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The same 12-month NHS complaints time limit applies. Your GP practice or ICB can use discretion to extend this if there are good reasons.',
    preRequirements: [
      'You can choose to complain to either the GP practice directly or to your local ICB — but not both simultaneously for the same issue',
      'Consider speaking to the practice manager informally first if the issue is straightforward'
    ],
    evidenceGuidance: [
      'Date(s) of the appointment(s) in question',
      'Name of the GP or staff member if known',
      'NHS number',
      'Copies of any letters or test results',
      'Prescription details if relevant',
      'Notes of what was said during consultations (written as soon as possible after the event)'
    ],
    warnings: [],
    steps: [
      {
        name: 'Complain to the GP Practice',
        description: 'Write to the practice manager. All GP surgeries must have a published complaints procedure.',
        timeline: 'Acknowledgement within 3 working days; response usually within 10-25 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhs.uk/service-search/find-a-gp',
        postalAddress: 'Practice Manager, [Surgery Name], [Surgery Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the practice\'s response, or prefer not to complain to the practice directly',
        infoNeeded: [
          'Your full name and contact details',
          'NHS number',
          'Date(s) of the appointment(s)',
          'Name of GP or staff member if known',
          'Description of what happened',
          'How it has affected you',
          'What outcome you want'
        ]
      },
      {
        name: 'NHS Integrated Care Board (ICB)',
        description: 'If you prefer not to complain to the practice directly, or are unhappy with their response, contact your local ICB.',
        timeline: 'Response within 6 months',
        contactEmail: null,
        portalUrl: 'https://www.nhs.uk/nhs-services/find-your-local-integrated-care-board/',
        postalAddress: null,
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the ICB\'s response',
        infoNeeded: [
          'Same details as for the GP practice complaint',
          'Copy of any previous complaint response if applicable'
        ]
      },
      {
        name: 'Parliamentary and Health Service Ombudsman (PHSO)',
        description: 'Final escalation if local resolution fails.',
        timeline: 'Investigation can take 6-12 months',
        contactEmail: 'phso.enquiries@ombudsman.org.uk',
        portalUrl: 'https://www.ombudsman.org.uk/making-complaint',
        postalAddress: 'Parliamentary and Health Service Ombudsman, Millbank Tower, Millbank, London SW1P 4QP',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PHSO is the final stage',
        infoNeeded: [
          'Copy of the final complaint response from the GP practice or ICB',
          'Your account of events and why the response was unsatisfactory',
          'How the situation affected you personally',
          'What you want the PHSO to achieve'
        ]
      }
    ],
    tips: [
      'You can choose to complain to either the practice or the ICB — not both simultaneously for the same issue',
      'If a GP\'s fitness to practise is in question, report to the GMC separately',
      'Your local Healthwatch can provide free advocacy',
      'Keep copies of all correspondence'
    ],
    legislation: 'NHS Constitution, Local Authority Social Services and NHS Complaints Regulations 2009'
  },

  social_care: {
    title: 'Social Care Complaint',
    description: 'Complaints about care homes, home care, or local authority social services.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The standard 12-month limit applies under the NHS and social care complaints regulations. Local authorities may exercise discretion to extend this.',
    preRequirements: [
      'Try raising the issue directly with the care provider or your social worker first',
      'If the person receiving care is at immediate risk, contact adult safeguarding at your local council immediately'
    ],
    evidenceGuidance: [
      'Care plan documents',
      'Dates of specific incidents',
      'Names of care workers involved if known',
      'Photographs of injuries, living conditions, or relevant evidence',
      'Any correspondence with the care provider',
      'Records of medications if relevant',
      'Names and contact details of witnesses'
    ],
    warnings: [
      'If someone is at immediate risk of harm, do not wait for the complaints process — contact the local authority safeguarding team or call 999'
    ],
    steps: [
      {
        name: 'Complain to the Care Provider',
        description: 'Raise your concern directly with the care home or home care provider first.',
        timeline: 'Varies by provider; most respond within 10-20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.cqc.org.uk/care-services',
        postalAddress: '[Care Provider Name], [Provider Address]',
        acknowledgmentTimeline: '3 working days (varies by provider)',
        escalationTrigger: 'If the provider does not resolve your concern, or if the care is commissioned by the local authority',
        infoNeeded: [
          'Name of the person receiving care',
          'Your relationship to them (and their consent if complaining on their behalf)',
          'Dates and details of incidents',
          'Names of staff involved if known',
          'What outcome you want'
        ]
      },
      {
        name: 'Local Authority Complaint',
        description: 'If the care is commissioned by the local authority, complain through their adult social care complaints procedure.',
        timeline: 'Usually a staged process over several months',
        contactEmail: null,
        portalUrl: null,
        postalAddress: 'Adult Social Care Complaints, [Council Name], [Council Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If the local authority\'s process doesn\'t resolve your complaint',
        infoNeeded: [
          'Full details of the complaint including dates',
          'Name of the person receiving care and their consent',
          'Any reference numbers from the care provider',
          'Copies of previous complaint correspondence'
        ]
      },
      {
        name: 'Local Government & Social Care Ombudsman (LGSCO)',
        description: 'If the local authority\'s process doesn\'t resolve your complaint, escalate to the LGSCO.',
        timeline: 'Investigation typically takes 3-6 months',
        contactEmail: null,
        portalUrl: 'https://www.lgo.org.uk/make-a-complaint',
        postalAddress: 'Local Government and Social Care Ombudsman, PO Box 4771, Coventry CV4 0EH',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The LGSCO is the final stage for council-commissioned social care',
        infoNeeded: [
          'Copy of the local authority\'s final complaint response',
          'Your account of why the response was unsatisfactory',
          'How the situation has affected the person receiving care and/or you',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Report serious safety concerns to the CQC (Care Quality Commission) immediately',
      'If the person lacks capacity, consider whether a safeguarding referral is needed',
      'Local Healthwatch and Age UK can provide advocacy support',
      'Keep a diary of incidents with dates and details'
    ],
    legislation: 'Care Act 2014, Health and Social Care Act 2008 (Regulated Activities) Regulations 2014'
  },

  council: {
    title: 'Council Services Complaint',
    description: 'Complaints about local council services (housing, planning, benefits, environmental health, etc.).',
    timeLimit: '12 months from the event (the LGSCO expects complaints within 12 months)',
    timeLimitDetail: 'Most councils accept complaints at any time, but the Local Government Ombudsman expects you to complain within 12 months. Complain as soon as possible while evidence is fresh.',
    preRequirements: [
      'Most councils require you to try resolving the issue with the service directly before making a formal complaint',
      'Contact the relevant department first — by phone, email, or in person — and give them a chance to put things right',
      'If you have already tried and the issue is not resolved, you can go straight to the formal complaints process'
    ],
    evidenceGuidance: [
      'Reference numbers for any council services (housing, council tax, planning applications)',
      'Dates of contact with the council and what was said',
      'Copies of letters, emails, or online messages',
      'Photographs if relevant (e.g. housing disrepair, environmental issues)',
      'Names of council officers you have dealt with if known',
      'Notes of phone conversations including dates and times'
    ],
    warnings: [],
    steps: [
      {
        name: 'Contact the Service Directly',
        description: 'Before making a formal complaint, contact the relevant council department and explain the problem. Give them a chance to resolve it.',
        timeline: 'Allow 10-15 working days for a response',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/find-local-council',
        postalAddress: null,
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'If the service does not resolve your issue, or you are unhappy with their response',
        infoNeeded: [
          'Your name and contact details',
          'Account or reference numbers',
          'Clear description of the problem',
          'What you want them to do'
        ]
      },
      {
        name: 'Council Complaints Procedure (Stage 1)',
        description: 'Submit a formal complaint to the council. Most councils have an online complaints form.',
        timeline: 'Response usually within 10-20 working days',
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/find-local-council',
        postalAddress: 'Complaints Team, [Council Name], [Council Address]',
        acknowledgmentTimeline: '3-5 working days',
        escalationTrigger: 'If you are unhappy with the Stage 1 response',
        infoNeeded: [
          'Full name, address, and contact details',
          'Service area the complaint relates to',
          'What happened and when',
          'What you have already done to try to resolve it',
          'What outcome you want',
          'Any relevant reference numbers'
        ]
      },
      {
        name: 'Council Complaints Procedure (Stage 2)',
        description: 'If unhappy with the Stage 1 response, request a review at Stage 2. A more senior officer will review your complaint.',
        timeline: 'Response usually within 20 working days',
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: '3-5 working days',
        escalationTrigger: 'If you are still unhappy after Stage 2',
        infoNeeded: [
          'Your Stage 1 complaint reference',
          'Why you are unhappy with the Stage 1 response',
          'What outcome you want'
        ]
      },
      {
        name: 'Local Government & Social Care Ombudsman (LGSCO)',
        description: 'Once you\'ve exhausted the council\'s complaints procedure, the LGSCO can investigate.',
        timeline: 'Investigation typically takes 3-6 months',
        contactEmail: null,
        portalUrl: 'https://www.lgo.org.uk/make-a-complaint',
        postalAddress: 'Local Government and Social Care Ombudsman, PO Box 4771, Coventry CV4 0EH',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The LGSCO is the final stage for council complaints',
        infoNeeded: [
          'Copy of the council\'s final complaint response',
          'Your account of events and why the response was unsatisfactory',
          'How the situation has affected you',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Keep records of all correspondence including dates and reference numbers',
      'Your local councillor can sometimes help escalate issues',
      'For housing disrepair, consider whether environmental health or the Housing Ombudsman is more appropriate',
      'Many councils allow you to complain online, by phone, by email, or in person'
    ],
    legislation: 'Relevant council-specific legislation varies by service area'
  },

  police: {
    title: 'Police Complaint',
    description: 'Complaints about police officer conduct, decisions, or service.',
    timeLimit: '12 months from the incident',
    timeLimitDetail: 'You should complain within 12 months of the incident. The police force has discretion to extend this time limit if there are good reasons for the delay.',
    preRequirements: [
      'You can complain directly to the force, at any police station, or through the IOPC',
      'For less serious issues, you may want to try local resolution first through the force\'s professional standards department'
    ],
    evidenceGuidance: [
      'Officer name(s), collar/shoulder number(s), rank, and station if known',
      'Date, time, and location of the incident',
      'Crime reference number or custody record number if applicable',
      'Body-worn camera may exist — note this in your complaint',
      'Names and contact details of any witnesses',
      'Photographs of any injuries',
      'CCTV footage if available (note locations of cameras)',
      'Medical records if you received treatment',
      'Your own written account, made as soon as possible after the event'
    ],
    warnings: [
      'If your complaint involves serious matters (death or serious injury, serious corruption, or a criminal offence by an officer), it may be referred directly to the IOPC'
    ],
    steps: [
      {
        name: 'Complain to the Police Force',
        description: 'Contact the force\'s Professional Standards Department (PSD). You can complain directly, at any police station, or by post/email.',
        timeline: 'Usually within 10-15 working days for initial response',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.police.uk/',
        postalAddress: 'Professional Standards Department, [Force Name], [Force HQ Address]',
        acknowledgmentTimeline: '15 working days',
        escalationTrigger: 'If you are unhappy with how your complaint was handled, you have the right to appeal/review',
        infoNeeded: [
          'Your full name, address, and contact details',
          'Date, time, and location of the incident',
          'Name(s) or description(s) of the officer(s) involved',
          'Officer collar/shoulder numbers if known',
          'Station the officer(s) are based at if known',
          'Detailed account of what happened',
          'Details of any witnesses',
          'Any reference numbers (crime ref, custody ref)',
          'Whether you are complaining on behalf of someone else (include their consent)'
        ]
      },
      {
        name: 'Independent Office for Police Conduct (IOPC)',
        description: 'If unhappy with how your complaint was handled, you can request a review from the IOPC. Serious matters may be referred directly.',
        timeline: 'Varies; complex investigations can take months',
        contactEmail: 'enquiries@policeconduct.gov.uk',
        portalUrl: 'https://www.policeconduct.gov.uk/complaints/make-a-complaint',
        postalAddress: 'Independent Office for Police Conduct, 10 South Colonnade, Canary Wharf, London E14 4PU',
        acknowledgmentTimeline: '15 working days',
        escalationTrigger: 'The IOPC review is the final stage for most police complaints',
        infoNeeded: [
          'Copy of the force\'s response to your complaint',
          'Why you are unhappy with how the complaint was handled',
          'Any new evidence not previously considered',
          'How the situation has affected you'
        ]
      }
    ],
    tips: [
      'You have 12 months from the incident to complain (the force can extend this)',
      'Complaints about serious corruption, death/serious injury, or discrimination may be referred directly to the IOPC',
      'You can also contact your Police and Crime Commissioner',
      'Consider getting free legal advice from a solicitor specialising in police complaints',
      'Ask the force to preserve body-worn camera footage as soon as possible, as it may be deleted after a set period'
    ],
    legislation: 'Police Reform Act 2002, Police (Complaints and Misconduct) Regulations 2020'
  },

  school: {
    title: 'School Complaint',
    description: 'Complaints about a state school or academy.',
    timeLimit: 'No statutory time limit, but complain as soon as possible',
    timeLimitDetail: 'There is no strict legal time limit for school complaints, but schools may set their own deadlines in their complaints procedures (often 3-6 months). Complaining promptly helps ensure the issue can be properly investigated.',
    preRequirements: [
      'All schools are required to have a published complaints procedure — check the school website or ask the school office',
      'Most procedures expect you to raise the concern informally with the class teacher or relevant member of staff first'
    ],
    evidenceGuidance: [
      'Dates of specific incidents',
      'Names of staff or pupils involved (where appropriate)',
      'Copies of relevant emails, letters, or notes from meetings',
      'School reports, IEPs, or EHCP documents if relevant',
      'Photographs or screenshots if applicable',
      'Notes from any conversations with school staff'
    ],
    warnings: [],
    steps: [
      {
        name: 'Raise Informally with Staff',
        description: 'Speak to the class teacher, head of year, or relevant member of staff. Many issues can be resolved informally.',
        timeline: 'Allow 5-10 school days for a response',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/school-performance-tables',
        postalAddress: null,
        acknowledgmentTimeline: '3-5 school days',
        escalationTrigger: 'If the issue is not resolved informally',
        infoNeeded: [
          'Brief description of your concern',
          'Your child\'s name and year group',
          'Dates of relevant incidents'
        ]
      },
      {
        name: 'Formal Complaint to the Headteacher',
        description: 'Write a formal complaint to the headteacher. Follow the school\'s published complaints procedure.',
        timeline: 'Most schools aim to respond within 10-15 school days',
        contactEmail: null,
        portalUrl: null,
        postalAddress: 'Headteacher, [School Name], [School Address]',
        acknowledgmentTimeline: '5 school days (varies by school)',
        escalationTrigger: 'If you are unhappy with the headteacher\'s response',
        infoNeeded: [
          'Your full name and contact details',
          'Your child\'s name, year group, and class',
          'Clear description of the complaint',
          'Dates of events',
          'What you have already done to resolve it',
          'What outcome you want'
        ]
      },
      {
        name: 'Governing Body / Academy Trust',
        description: 'If unresolved, escalate to the school\'s governing body (state schools) or academy trust board.',
        timeline: 'Usually convenes a complaints panel within a few weeks',
        contactEmail: null,
        portalUrl: null,
        postalAddress: 'Chair of Governors, [School Name], [School Address]',
        acknowledgmentTimeline: '5-10 school days',
        escalationTrigger: 'If the governing body panel does not resolve your complaint',
        infoNeeded: [
          'Copy of your complaint and the headteacher\'s response',
          'Why you remain dissatisfied',
          'What outcome you are seeking'
        ]
      },
      {
        name: 'Department for Education / Local Government Ombudsman',
        description: 'For academies, complain to the Education and Skills Funding Agency (ESFA). For maintained schools, the LGSCO may investigate.',
        timeline: 'Varies by route',
        contactEmail: null,
        portalUrl: 'https://form.education.gov.uk/service/Contact_the_Department_for_Education',
        postalAddress: 'Department for Education, Sanctuary Buildings, 20 Great Smith Street, London SW1P 3BT',
        acknowledgmentTimeline: 'Varies',
        escalationTrigger: 'These are the final external options',
        infoNeeded: [
          'Evidence that you have completed the school\'s complaints procedure',
          'Copy of the governing body\'s decision',
          'Details of your complaint and why the school\'s response was inadequate'
        ]
      }
    ],
    tips: [
      'All schools must have a published complaints procedure',
      'Ofsted does not investigate individual complaints but welcomes information about schools',
      'For special educational needs disputes, consider SEND Tribunal',
      'For exclusion appeals, there is a separate process via an independent review panel',
      'Keep a record of all meetings and conversations'
    ],
    legislation: 'Education Act 2002 (Section 29), School Complaints (England) Regulations 2006 (proposed)'
  },

  dwp_decision: {
    title: 'DWP Benefits Decision Challenge',
    description: 'Challenging a DWP benefits decision (Universal Credit, PIP, ESA, JSA, State Pension, etc.).',
    timeLimit: '1 month from the date of the decision letter',
    timeLimitDetail: 'You must request a mandatory reconsideration within one calendar month of the date on the decision letter. Late requests may be accepted if you have good reasons (up to 13 months), but act quickly. The DWP decision maker reviews the whole claim — the outcome could stay the same, go up, or go down.',
    preRequirements: [
      'You must request a mandatory reconsideration before you can appeal to a tribunal',
      'Check the decision letter carefully — it will explain what you can do if you disagree'
    ],
    evidenceGuidance: [
      'Copy of the decision letter (including the date)',
      'National Insurance number',
      'Benefit claim reference number',
      'Any new medical evidence (GP letters, hospital reports, specialist assessments)',
      'Details of how your condition affects your daily life',
      'Supporting letters from carers, family, support workers',
      'Copy of any assessment report (e.g. PIP assessment, WCA report) — you can request this from DWP'
    ],
    warnings: [
      'Mandatory reconsideration reviews the entire claim — the outcome could go down as well as up or stay the same',
      'The one-month deadline is strict — request reconsideration as soon as possible, even if you are still gathering evidence (you can send evidence later)',
      'If your benefit has been stopped, you may be able to claim a different benefit while waiting'
    ],
    steps: [
      {
        name: 'Request Mandatory Reconsideration',
        description: 'Contact DWP to say you disagree with the decision. You can do this by phone, online (for some benefits), or in writing. Explain clearly why you think the decision is wrong and include any new evidence.',
        timeline: 'DWP aims for a decision within a few weeks, but it can take longer',
        current: true,
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: 'DWP should confirm receipt; follow up if you do not hear back within 2 weeks',
        escalationTrigger: 'If the mandatory reconsideration upholds the original decision and you still disagree',
        infoNeeded: [
          'National Insurance number',
          'Benefit claim reference number',
          'Date of the decision you are challenging',
          'Clear reasons why you think the decision is wrong',
          'Any new evidence to support your case'
        ]
      },
      {
        name: 'Appeal to the First-tier Tribunal',
        description: 'If mandatory reconsideration upholds the decision, you can appeal to an independent tribunal. The tribunal is not part of DWP and makes its own decision based on the evidence.',
        timeline: 'Hearing typically within a few months of appeal',
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/appeal-benefit-decision',
        postalAddress: 'HM Courts & Tribunals Service, Social Security and Child Support, PO Box 14620, Birmingham B16 6FR',
        acknowledgmentTimeline: 'Written acknowledgment within a few weeks',
        escalationTrigger: 'You can request permission to appeal to the Upper Tribunal on a point of law only',
        infoNeeded: [
          'Copy of the Mandatory Reconsideration Notice (MRN)',
          'Your SSCS1 appeal form (available online or from the tribunal)',
          'All supporting evidence',
          'Clear explanation of why the decision is wrong',
          'Whether you want a paper hearing or an oral hearing (oral hearings have higher success rates)'
        ]
      }
    ],
    tips: [
      'Mandatory reconsideration has a strict one-month deadline — act quickly',
      'You can request a copy of your assessment report (e.g. PIP assessment, WCA report) from DWP — this can help you understand the decision and prepare your case',
      'Citizens Advice and welfare rights organisations can help with appeals for free',
      'At tribunal, success rates are significantly higher with an oral hearing and representation',
      'If you have a new health condition or your condition has worsened, consider making a new claim instead of (or as well as) challenging the old decision'
    ],
    legislation: 'Social Security Act 1998, Tribunal Procedure (First-tier Tribunal) (Social Entitlement Chamber) Rules 2008'
  },

  dwp_service: {
    title: 'DWP Service Complaint',
    description: 'Complaints about DWP service quality, staff conduct, delays, or maladministration (not about the benefit decision itself).',
    timeLimit: '12 months (ICE expects complaints within 12 months of completing DWP\'s process)',
    timeLimitDetail: 'There is no strict statutory time limit for DWP service complaints, but the Independent Case Examiner expects complaints to be referred within 12 months of completing DWP\'s internal complaints process.',
    preRequirements: [
      'You must complain to DWP directly first and complete their internal complaints process before escalating',
      'Make sure your complaint is about the service (e.g. delays, staff conduct, lost paperwork, wrong information given) rather than disagreeing with a benefit decision'
    ],
    evidenceGuidance: [
      'National Insurance number',
      'Benefit claim reference number',
      'Dates of contact with DWP and what happened',
      'Names of DWP staff you dealt with if known',
      'Copies of letters, texts, or journal messages',
      'Notes of phone conversations (dates, times, what was said)',
      'Details of any financial loss caused by the DWP\'s error'
    ],
    warnings: [
      'This process is for service complaints only — if you disagree with a benefit decision, you need the mandatory reconsideration and appeal process instead'
    ],
    steps: [
      {
        name: 'DWP Complaints Procedure',
        description: 'Contact DWP through their complaints process. You can complain online, by phone, or in writing. If your complaint is about Jobcentre Plus, contact your local office.',
        timeline: 'Response usually within 15 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/government/organisations/department-for-work-pensions/about/complaints-procedure',
        postalAddress: null,
        acknowledgmentTimeline: '3-5 working days',
        escalationTrigger: 'If you are unhappy with DWP\'s response, ask for a review by a complaint resolution manager',
        infoNeeded: [
          'Full name and contact details',
          'National Insurance number',
          'Benefit claim reference number',
          'Clear description of what went wrong',
          'Dates and details of events',
          'What outcome you want (apology, compensation, change in process)'
        ]
      },
      {
        name: 'Independent Case Examiner (ICE)',
        description: 'If DWP\'s internal complaints process does not resolve your issue, you can escalate to the Independent Case Examiner.',
        timeline: 'Several months — ICE has a significant backlog',
        contactEmail: 'ice@dwp.gov.uk',
        portalUrl: 'https://www.gov.uk/government/organisations/independent-case-examiner',
        postalAddress: 'Independent Case Examiner, PO Box 209, Bootle L20 7WA',
        acknowledgmentTimeline: 'A few weeks (due to volume)',
        escalationTrigger: 'If you are unhappy with ICE\'s outcome',
        infoNeeded: [
          'Copy of DWP\'s final complaint response',
          'Your account of what happened and why the response was unsatisfactory',
          'Details of the impact on you',
          'What outcome you want'
        ]
      },
      {
        name: 'Parliamentary and Health Service Ombudsman (PHSO)',
        description: 'The PHSO can investigate if ICE has not resolved your complaint. You must contact them through your MP.',
        timeline: 'Several months',
        contactEmail: 'phso.enquiries@ombudsman.org.uk',
        portalUrl: 'https://www.ombudsman.org.uk/making-complaint',
        postalAddress: 'Parliamentary and Health Service Ombudsman, Millbank Tower, Millbank, London SW1P 4QP',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PHSO is the final stage',
        infoNeeded: [
          'Copy of ICE\'s final response',
          'Your MP must refer the complaint to the PHSO',
          'Full account of how the situation has affected you',
          'What remedy you are seeking'
        ]
      }
    ],
    tips: [
      'Make sure you are using the right process — decision challenges go through mandatory reconsideration, service complaints go through this process',
      'You can claim compensation from DWP for proven financial losses caused by their errors',
      'Citizens Advice can help you with DWP complaints',
      'If DWP owes you money due to their error, they should pay this regardless of the complaints process'
    ],
    legislation: 'DWP Complaints Procedure, Parliamentary Commissioner Act 1967'
  },

  // Keep the old "dwp" key as an alias — getPathway() will route based on complaintType
  dwp: {
    title: 'DWP Benefits Complaint',
    description: 'Complaints about DWP benefits decisions or service (Universal Credit, PIP, ESA, etc.).',
    timeLimit: '1 month for decision challenges; 12 months for service complaints',
    timeLimitDetail: 'If you are challenging a benefit decision, you have one calendar month from the decision letter to request a mandatory reconsideration. For service complaints, the Independent Case Examiner expects complaints within 12 months.',
    preRequirements: [
      'First determine whether you are challenging a decision or complaining about the service — they are completely different processes',
      'For decisions: you must request mandatory reconsideration before you can appeal',
      'For service: you must complain to DWP directly first'
    ],
    evidenceGuidance: [
      'National Insurance number',
      'Benefit claim reference number',
      'Copy of the decision letter (if challenging a decision)',
      'Medical evidence (if relevant)',
      'Dates of contact with DWP',
      'Notes of phone conversations',
      'Copies of all correspondence'
    ],
    warnings: [
      'Decision challenges and service complaints are completely different processes — make sure you use the right one',
      'For decision challenges: mandatory reconsideration reviews the whole claim — the outcome could go down as well as up'
    ],
    steps: [
      {
        name: 'Mandatory Reconsideration (for decision challenges)',
        description: 'If you disagree with a benefits decision, request a mandatory reconsideration within one month of the decision letter.',
        timeline: 'DWP aims for a decision within a few weeks',
        current: true,
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: 'Follow up if no response within 2 weeks',
        escalationTrigger: 'If the mandatory reconsideration upholds the original decision',
        infoNeeded: [
          'National Insurance number',
          'Claim reference number',
          'Date of the decision letter',
          'Reasons you disagree',
          'Any new evidence'
        ]
      },
      {
        name: 'Appeal to the Tribunal (for decision challenges)',
        description: 'If mandatory reconsideration upholds the decision, appeal to the First-tier Tribunal.',
        timeline: 'Hearing typically within a few months of appeal',
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/appeal-benefit-decision',
        postalAddress: 'HM Courts & Tribunals Service, Social Security and Child Support, PO Box 14620, Birmingham B16 6FR',
        acknowledgmentTimeline: 'Written acknowledgment within a few weeks',
        escalationTrigger: 'Upper Tribunal appeal on point of law only',
        infoNeeded: [
          'Mandatory Reconsideration Notice',
          'SSCS1 appeal form',
          'All supporting evidence'
        ]
      },
      {
        name: 'DWP Complaints Procedure (for service issues)',
        description: 'For service complaints (not decisions), use the DWP complaints process.',
        timeline: 'Response usually within 15 working days',
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/government/organisations/department-for-work-pensions/about/complaints-procedure',
        postalAddress: null,
        acknowledgmentTimeline: '3-5 working days',
        escalationTrigger: 'If DWP\'s response is unsatisfactory',
        infoNeeded: [
          'National Insurance number',
          'Claim reference number',
          'Details of the service issue',
          'What outcome you want'
        ]
      },
      {
        name: 'Independent Case Examiner / PHSO',
        description: 'If the DWP complaints process doesn\'t resolve your service issue, escalate to the Independent Case Examiner, then the PHSO.',
        timeline: 'Several months',
        contactEmail: 'ice@dwp.gov.uk',
        portalUrl: 'https://www.gov.uk/government/organisations/independent-case-examiner',
        postalAddress: 'Independent Case Examiner, PO Box 209, Bootle L20 7WA',
        acknowledgmentTimeline: 'A few weeks',
        escalationTrigger: 'PHSO is the final stage (via your MP)',
        infoNeeded: [
          'Copy of DWP\'s final response',
          'Your account of events',
          'Impact on you'
        ]
      }
    ],
    tips: [
      'Mandatory reconsideration has a strict one-month deadline — act quickly',
      'You can request a "mandatory reconsideration notice" if you haven\'t received one',
      'Citizens Advice and welfare rights organisations can help with appeals for free',
      'At tribunal, success rates are significantly higher with representation',
      'Decision challenges and service complaints are separate processes — make sure you use the right one'
    ],
    legislation: 'Social Security Act 1998, Tribunal Procedure (First-tier Tribunal) (Social Entitlement Chamber) Rules 2008'
  },

  hmrc: {
    title: 'HMRC Complaint',
    description: 'Complaints about HMRC tax service, decisions, or conduct.',
    timeLimit: '12 months (the Adjudicator expects complaints within 6 months of HMRC\'s final response)',
    timeLimitDetail: 'HMRC does not set a strict time limit for initial complaints, but the Adjudicator\'s Office expects complaints within 6 months of HMRC\'s final response. Complain as soon as possible.',
    preRequirements: [
      'You must complain to HMRC directly first and complete both tiers of their internal process before escalating to the Adjudicator',
      'For tax decision disputes (e.g. tax liability, penalties), you may need the tax tribunal instead of the complaints process'
    ],
    evidenceGuidance: [
      'Your tax reference number (UTR for self-assessment, or NI number)',
      'Dates of contact with HMRC and what was discussed',
      'Copies of tax calculations, letters, or notices',
      'Details of any financial loss caused by HMRC\'s error',
      'Notes of phone calls including dates, times, and what was said',
      'Copies of your tax returns if relevant'
    ],
    warnings: [],
    steps: [
      {
        name: 'HMRC Complaints Process (Tier 1)',
        description: 'Contact HMRC directly through their complaints process. You can call, write, or use the online form.',
        timeline: 'HMRC aims to respond within 15 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.gov.uk/complain-about-hmrc',
        postalAddress: null,
        acknowledgmentTimeline: 'Verbal or written acknowledgment within a few days',
        escalationTrigger: 'If you are unhappy with the initial response',
        infoNeeded: [
          'Full name and contact details',
          'Tax reference number or NI number',
          'Clear description of the problem',
          'Dates and details of events',
          'What outcome you want'
        ]
      },
      {
        name: 'HMRC Tier 2 Review',
        description: 'If unhappy with the initial response, ask for a Tier 2 review by a complaints handler.',
        timeline: 'Usually within 15 working days',
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: 'A few days',
        escalationTrigger: 'If the Tier 2 response is still unsatisfactory',
        infoNeeded: [
          'Your complaint reference number',
          'Why you are unhappy with the Tier 1 response',
          'Any additional information or evidence'
        ]
      },
      {
        name: 'The Adjudicator\'s Office',
        description: 'An independent body that looks into complaints about HMRC\'s handling of your affairs.',
        timeline: 'Investigation can take several months',
        contactEmail: 'enquiries@adjudicatorsoffice.gov.uk',
        portalUrl: 'https://www.gov.uk/government/organisations/the-adjudicators-office',
        postalAddress: 'The Adjudicator\'s Office, PO Box 10280, Nottingham NG2 9PF',
        acknowledgmentTimeline: '10 working days',
        escalationTrigger: 'If the Adjudicator cannot resolve your complaint',
        infoNeeded: [
          'Copy of HMRC\'s final complaint response',
          'Full details of your complaint',
          'How the situation has affected you',
          'What outcome you want'
        ]
      },
      {
        name: 'Parliamentary and Health Service Ombudsman (PHSO)',
        description: 'Final escalation via your MP. The PHSO can investigate if the Adjudicator has not resolved your complaint.',
        timeline: 'Several months',
        contactEmail: 'phso.enquiries@ombudsman.org.uk',
        portalUrl: 'https://www.ombudsman.org.uk/making-complaint',
        postalAddress: 'Parliamentary and Health Service Ombudsman, Millbank Tower, Millbank, London SW1P 4QP',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PHSO is the final stage',
        infoNeeded: [
          'Copy of the Adjudicator\'s response',
          'Your MP must refer the complaint',
          'Full account of how the situation has affected you',
          'What remedy you are seeking'
        ]
      }
    ],
    tips: [
      'For tax decision disputes (not service complaints), you may need the tax tribunal instead',
      'Keep copies of all correspondence and note reference numbers',
      'You can claim compensation for HMRC errors that cost you money',
      'TaxAid and Tax Help for Older People offer free advice',
      'HMRC has a dedicated helpline for complaints — check gov.uk for the current number'
    ],
    legislation: 'HMRC Charter, Finance Act (various)'
  },

  // ── Scotland Pathways ──

  nhs_trust_scotland: {
    title: 'NHS Scotland Complaint',
    description: 'Complaints about care received at an NHS Scotland hospital or health board.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'NHS Scotland complaints follow the same 12-month time limit. The SPSO expects complaints within 12 months of the event or of becoming aware of the issue.',
    preRequirements: [
      'Complain to the NHS board or hospital directly first',
      'The board must respond before you can escalate to the SPSO'
    ],
    evidenceGuidance: [
      'Dates of appointments, admissions, and discharges',
      'Names of staff involved if known',
      'Ward or department name',
      'CHI number (Community Health Index — Scotland\'s patient identifier)',
      'Copies of any correspondence',
      'A timeline of events in your own words'
    ],
    warnings: [],
    steps: [
      {
        name: 'Formal Complaint to the NHS Board',
        description: 'Write a formal complaint to the NHS board\'s complaints department. They must acknowledge within 3 working days.',
        timeline: 'Response within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhsinform.scot/care-support-and-rights/health-rights/feedback-and-complaints/complaining-about-the-nhs/',
        postalAddress: 'Complaints Department, [NHS Board Name], [Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the board\'s final response',
        infoNeeded: [
          'Full name and contact details',
          'CHI number if available',
          'Date(s) of treatment or events',
          'Ward, department, or clinic name',
          'Clear description of what went wrong',
          'What outcome you want'
        ]
      },
      {
        name: 'Scottish Public Services Ombudsman (SPSO)',
        description: 'If unhappy with the NHS board\'s response, escalate to the SPSO. They investigate independently.',
        timeline: 'Investigation can take several months',
        contactEmail: null,
        portalUrl: 'https://www.spso.org.uk/complain/form/start',
        postalAddress: 'SPSO, Bridgeside House, 99 McDonald Road, Edinburgh EH7 4NS',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The SPSO is the final stage',
        infoNeeded: [
          'Copy of the NHS board\'s final complaint response',
          'Your account of what happened',
          'How the situation has affected you',
          'What you want the SPSO to achieve'
        ]
      }
    ],
    tips: [
      'The SPSO expects complaints within 12 months of the event',
      'You can contact the Patient Advice and Support Service (PASS) for free advocacy',
      'Professional conduct issues can be reported to the GMC, NMC, or relevant regulator',
      'Keep copies of everything you send and receive'
    ],
    legislation: 'NHS Scotland Complaints Procedure, Scottish Public Services Ombudsman Act 2002'
  },

  gp_scotland: {
    title: 'GP Surgery Complaint (Scotland)',
    description: 'Complaints about care from your GP surgery in Scotland.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The same 12-month time limit applies. The SPSO expects complaints within 12 months.',
    preRequirements: [
      'Complain to the GP practice directly first',
      'You can also complain to your NHS board if you prefer not to complain to the practice'
    ],
    evidenceGuidance: [
      'Date(s) of the appointment(s) in question',
      'Name of the GP or staff member if known',
      'CHI number',
      'Copies of any letters or test results',
      'Notes of what was said during consultations'
    ],
    warnings: [],
    steps: [
      {
        name: 'Complain to the GP Practice',
        description: 'Write to the practice manager. All GP surgeries must have a complaints procedure.',
        timeline: 'Response within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhsinform.scot/care-support-and-rights/health-rights/feedback-and-complaints/complaining-about-the-nhs/',
        postalAddress: 'Practice Manager, [Surgery Name], [Surgery Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the practice\'s response',
        infoNeeded: [
          'Your full name and contact details',
          'CHI number',
          'Date(s) of the appointment(s)',
          'Description of what happened',
          'What outcome you want'
        ]
      },
      {
        name: 'Scottish Public Services Ombudsman (SPSO)',
        description: 'Final escalation if local resolution fails.',
        timeline: 'Investigation can take several months',
        contactEmail: null,
        portalUrl: 'https://www.spso.org.uk/complain/form/start',
        postalAddress: 'SPSO, Bridgeside House, 99 McDonald Road, Edinburgh EH7 4NS',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The SPSO is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of events',
          'How the situation affected you',
          'What you want the SPSO to achieve'
        ]
      }
    ],
    tips: [
      'Contact the Patient Advice and Support Service (PASS) for free help',
      'If a GP\'s fitness to practise is in question, report to the GMC',
      'Keep copies of all correspondence'
    ],
    legislation: 'NHS Scotland Complaints Procedure, Scottish Public Services Ombudsman Act 2002'
  },

  council_scotland: {
    title: 'Council Services Complaint (Scotland)',
    description: 'Complaints about Scottish council services (housing, planning, social work, etc.).',
    timeLimit: '12 months from the event (the SPSO expects complaints within 12 months)',
    timeLimitDetail: 'Scottish councils follow a two-stage complaints procedure. The SPSO expects complaints within 12 months of the event.',
    preRequirements: [
      'Scottish councils have a standard two-stage complaints process',
      'You must complete the council\'s process before going to the SPSO'
    ],
    evidenceGuidance: [
      'Reference numbers for council services',
      'Dates of contact with the council',
      'Copies of letters, emails, or online messages',
      'Names of council officers you dealt with',
      'Photographs if relevant'
    ],
    warnings: [],
    steps: [
      {
        name: 'Council Complaints (Stage 1 — Frontline Resolution)',
        description: 'Contact the council\'s complaints team. Stage 1 aims for a quick resolution.',
        timeline: 'Response within 5 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.mygov.scot/organisations',
        postalAddress: 'Complaints Team, [Council Name], [Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the Stage 1 response',
        infoNeeded: [
          'Full name, address, and contact details',
          'Service area the complaint relates to',
          'What happened and when',
          'What outcome you want'
        ]
      },
      {
        name: 'Council Complaints (Stage 2 — Investigation)',
        description: 'If unhappy with Stage 1, request a Stage 2 investigation. A more senior officer will investigate.',
        timeline: 'Response within 20 working days',
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are still unhappy after Stage 2',
        infoNeeded: [
          'Your Stage 1 complaint reference',
          'Why you are unhappy with the Stage 1 response',
          'What outcome you want'
        ]
      },
      {
        name: 'Scottish Public Services Ombudsman (SPSO)',
        description: 'Once you\'ve completed the council\'s process, the SPSO can investigate.',
        timeline: 'Investigation can take several months',
        contactEmail: null,
        portalUrl: 'https://www.spso.org.uk/complain/form/start',
        postalAddress: 'SPSO, Bridgeside House, 99 McDonald Road, Edinburgh EH7 4NS',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The SPSO is the final stage',
        infoNeeded: [
          'Copy of the council\'s final complaint response',
          'Your account of events',
          'How the situation has affected you',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Scottish councils follow a standard two-stage complaints procedure',
      'Your local councillor can sometimes help escalate issues',
      'Citizens Advice Scotland can provide free support',
      'Keep records of all correspondence'
    ],
    legislation: 'Scottish Public Services Ombudsman Act 2002, Local Government (Scotland) Act 1973'
  },

  police_scotland: {
    title: 'Police Scotland Complaint',
    description: 'Complaints about Police Scotland officer conduct, decisions, or service.',
    timeLimit: '12 months from the incident',
    timeLimitDetail: 'You should complain within 12 months. Police Scotland has discretion to extend this.',
    preRequirements: [
      'You can complain directly to Police Scotland, or through PIRC for serious matters',
      'For less serious issues, local resolution may be offered first'
    ],
    evidenceGuidance: [
      'Officer name(s), collar/shoulder number(s), rank if known',
      'Date, time, and location of the incident',
      'Crime reference number or custody record number',
      'Names and contact details of witnesses',
      'Photographs of any injuries',
      'Your own written account made as soon as possible'
    ],
    warnings: [
      'Serious matters (death, serious injury, serious corruption) may be referred directly to PIRC'
    ],
    steps: [
      {
        name: 'Complain to Police Scotland',
        description: 'Contact Police Scotland\'s Professional Standards Department.',
        timeline: 'Usually within 15 working days for initial response',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.scotland.police.uk/about-us/how-to-complain/',
        postalAddress: 'Professional Standards Department, Police Scotland, Tulliallan Castle, Kincardine FK10 4BE',
        acknowledgmentTimeline: '15 working days',
        escalationTrigger: 'If you are unhappy with how your complaint was handled',
        infoNeeded: [
          'Your full name, address, and contact details',
          'Date, time, and location of the incident',
          'Name(s) or description(s) of officer(s)',
          'Detailed account of what happened',
          'Any reference numbers'
        ]
      },
      {
        name: 'Police Investigations & Review Commissioner (PIRC)',
        description: 'If unhappy with Police Scotland\'s handling, you can request a review from PIRC. Serious matters may be referred directly.',
        timeline: 'Varies; investigations can take months',
        contactEmail: null,
        portalUrl: 'https://pirc.scot/making-a-complaint/',
        postalAddress: 'PIRC, Hamilton House, Hamilton Business Park, Caird Park, Hamilton ML3 0QA',
        acknowledgmentTimeline: '10 working days',
        escalationTrigger: 'PIRC is the final review stage for police complaints in Scotland',
        infoNeeded: [
          'Copy of Police Scotland\'s response',
          'Why you are unhappy with the handling',
          'Any new evidence'
        ]
      }
    ],
    tips: [
      'You have 12 months from the incident to complain',
      'For very serious matters, contact PIRC directly',
      'Keep a written record of events as soon as possible',
      'You can also contact the Scottish Police Authority'
    ],
    legislation: 'Police and Fire Reform (Scotland) Act 2012, Police Investigations & Review Commissioner'
  },

  social_care_scotland: {
    title: 'Social Care Complaint (Scotland)',
    description: 'Complaints about care homes, home care, or local authority social work in Scotland.',
    timeLimit: '12 months from the event',
    timeLimitDetail: 'The SPSO expects complaints within 12 months of the event or of becoming aware of the issue.',
    preRequirements: [
      'Try raising the issue directly with the care provider first',
      'If the person is at immediate risk, contact adult protection at your local council'
    ],
    evidenceGuidance: [
      'Care plan documents',
      'Dates of specific incidents',
      'Names of care workers involved if known',
      'Photographs or relevant evidence',
      'Correspondence with the care provider'
    ],
    warnings: [
      'If someone is at immediate risk, contact the local authority adult protection team or call 999'
    ],
    steps: [
      {
        name: 'Complain to the Care Provider',
        description: 'Raise your concern directly with the care home or home care provider first.',
        timeline: 'Usually within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.careinspectorate.com/index.php/care-services',
        postalAddress: '[Care Provider Name], [Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If the provider does not resolve your concern',
        infoNeeded: [
          'Name of the person receiving care',
          'Your relationship to them',
          'Dates and details of incidents',
          'What outcome you want'
        ]
      },
      {
        name: 'Local Authority Social Work Complaints',
        description: 'If the care is commissioned by the council, complain through their social work complaints procedure.',
        timeline: 'Varies; follows the council\'s two-stage process',
        contactEmail: null,
        portalUrl: null,
        postalAddress: 'Social Work Complaints, [Council Name], [Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If the council\'s process doesn\'t resolve your complaint',
        infoNeeded: [
          'Full details of the complaint including dates',
          'Name of the person receiving care and their consent',
          'Previous complaint correspondence'
        ]
      },
      {
        name: 'Scottish Public Services Ombudsman (SPSO)',
        description: 'If the council process doesn\'t resolve your complaint, escalate to the SPSO.',
        timeline: 'Investigation can take several months',
        contactEmail: null,
        portalUrl: 'https://www.spso.org.uk/complain/form/start',
        postalAddress: 'SPSO, Bridgeside House, 99 McDonald Road, Edinburgh EH7 4NS',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The SPSO is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of why the response was unsatisfactory',
          'How the situation has affected the person',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Report serious safety concerns to the Care Inspectorate',
      'Scottish Independent Advocacy Alliance can help find local advocacy support',
      'Keep a diary of incidents with dates and details'
    ],
    legislation: 'Scottish Public Services Ombudsman Act 2002, Social Work (Scotland) Act 1968, Public Services Reform (Scotland) Act 2010'
  },

  // ── Wales Pathways ──

  nhs_trust_wales: {
    title: 'NHS Wales Complaint',
    description: 'Complaints about care received at an NHS Wales hospital or health board.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'NHS Wales complaints follow the Putting Things Right regulations with a 12-month time limit. The PSOW expects complaints within 12 months.',
    preRequirements: [
      'Under Putting Things Right, all NHS concerns in Wales go through the health board',
      'You do not need to go through PALS — complain directly to the health board\'s concerns team'
    ],
    evidenceGuidance: [
      'Dates of appointments, admissions, and discharges',
      'Names of staff involved if known',
      'Ward or department name',
      'NHS number',
      'Copies of any correspondence',
      'A timeline of events in your own words'
    ],
    warnings: [],
    steps: [
      {
        name: 'Formal Concern to the Health Board (Putting Things Right)',
        description: 'Submit a formal concern to the NHS health board under the Putting Things Right process. They must acknowledge within 2 working days.',
        timeline: 'Investigation within 30 working days; complex cases may take longer',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhsdirect.wales.nhs.uk/localservices/',
        postalAddress: 'Concerns Team, [Health Board Name], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If you are unhappy with the health board\'s response',
        infoNeeded: [
          'Full name and contact details',
          'NHS number if available',
          'Date(s) of treatment or events',
          'Ward, department, or clinic name',
          'Clear description of what went wrong',
          'What outcome you want'
        ]
      },
      {
        name: 'Public Services Ombudsman for Wales (PSOW)',
        description: 'If unhappy with the health board\'s response, escalate to the PSOW.',
        timeline: 'Investigation can take several months',
        contactEmail: 'ask@ombudsman.wales',
        portalUrl: 'https://www.ombudsman.wales/make-a-complaint/',
        postalAddress: 'Public Services Ombudsman for Wales, 1 Ffordd yr Hen Gae, Pencoed CF35 5LJ',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PSOW is the final stage',
        infoNeeded: [
          'Copy of the health board\'s final response',
          'Your account of what happened',
          'How the situation has affected you',
          'What you want the PSOW to achieve'
        ]
      }
    ],
    tips: [
      'Wales uses the Putting Things Right process for all NHS concerns',
      'Llais (formerly Community Health Council) can provide free advocacy',
      'Professional conduct issues can be reported to the GMC, NMC, or relevant regulator',
      'Keep copies of everything you send and receive'
    ],
    legislation: 'NHS (Concerns, Complaints and Redress Arrangements) (Wales) Regulations 2011, Public Services Ombudsman (Wales) Act 2019'
  },

  gp_wales: {
    title: 'GP Surgery Complaint (Wales)',
    description: 'Complaints about care from your GP surgery in Wales.',
    timeLimit: '12 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The same 12-month Putting Things Right time limit applies. The PSOW expects complaints within 12 months.',
    preRequirements: [
      'Under Putting Things Right, you can complain to either the GP practice or the health board',
      'The health board manages complaints about GP services in its area'
    ],
    evidenceGuidance: [
      'Date(s) of the appointment(s) in question',
      'Name of the GP or staff member if known',
      'NHS number',
      'Copies of any letters or test results',
      'Notes of what was said during consultations'
    ],
    warnings: [],
    steps: [
      {
        name: 'Complain to the GP Practice or Health Board',
        description: 'Under Putting Things Right, submit your concern to the GP practice or the local health board.',
        timeline: 'Investigation within 30 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nhsdirect.wales.nhs.uk/localservices/',
        postalAddress: 'Practice Manager, [Surgery Name], [Surgery Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If you are unhappy with the response',
        infoNeeded: [
          'Your full name and contact details',
          'NHS number',
          'Date(s) of the appointment(s)',
          'Description of what happened',
          'What outcome you want'
        ]
      },
      {
        name: 'Public Services Ombudsman for Wales (PSOW)',
        description: 'Final escalation if local resolution fails.',
        timeline: 'Investigation can take several months',
        contactEmail: 'ask@ombudsman.wales',
        portalUrl: 'https://www.ombudsman.wales/make-a-complaint/',
        postalAddress: 'Public Services Ombudsman for Wales, 1 Ffordd yr Hen Gae, Pencoed CF35 5LJ',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PSOW is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of events',
          'How the situation affected you',
          'What you want the PSOW to achieve'
        ]
      }
    ],
    tips: [
      'Llais (formerly CHC) can provide free advocacy in Wales',
      'If a GP\'s fitness to practise is in question, report to the GMC',
      'Keep copies of all correspondence'
    ],
    legislation: 'NHS (Concerns, Complaints and Redress Arrangements) (Wales) Regulations 2011, Public Services Ombudsman (Wales) Act 2019'
  },

  council_wales: {
    title: 'Council Services Complaint (Wales)',
    description: 'Complaints about Welsh council services (housing, planning, social services, etc.).',
    timeLimit: '12 months from the event (the PSOW expects complaints within 12 months)',
    timeLimitDetail: 'Welsh councils follow a two-stage complaints process. The PSOW expects complaints within 12 months of the event.',
    preRequirements: [
      'Welsh councils follow a standard two-stage complaints process',
      'You must complete the council\'s process before going to the PSOW'
    ],
    evidenceGuidance: [
      'Reference numbers for council services',
      'Dates of contact with the council',
      'Copies of letters, emails, or online messages',
      'Names of council officers you dealt with',
      'Photographs if relevant'
    ],
    warnings: [],
    steps: [
      {
        name: 'Council Complaints (Stage 1 — Informal/Early Resolution)',
        description: 'Contact the council to raise your complaint. Stage 1 aims for quick resolution.',
        timeline: 'Response within 10 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.gov.wales/local-authorities-in-wales',
        postalAddress: 'Complaints Team, [Council Name], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If you are unhappy with the Stage 1 response',
        infoNeeded: [
          'Full name, address, and contact details',
          'Service area the complaint relates to',
          'What happened and when',
          'What outcome you want'
        ]
      },
      {
        name: 'Council Complaints (Stage 2 — Formal Investigation)',
        description: 'If unhappy with Stage 1, request a Stage 2 formal investigation.',
        timeline: 'Response within 20 working days',
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'If you are still unhappy after Stage 2',
        infoNeeded: [
          'Your Stage 1 complaint reference',
          'Why you are unhappy with the Stage 1 response',
          'What outcome you want'
        ]
      },
      {
        name: 'Public Services Ombudsman for Wales (PSOW)',
        description: 'Once you\'ve completed the council\'s process, the PSOW can investigate.',
        timeline: 'Investigation can take several months',
        contactEmail: 'ask@ombudsman.wales',
        portalUrl: 'https://www.ombudsman.wales/make-a-complaint/',
        postalAddress: 'Public Services Ombudsman for Wales, 1 Ffordd yr Hen Gae, Pencoed CF35 5LJ',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PSOW is the final stage',
        infoNeeded: [
          'Copy of the council\'s final complaint response',
          'Your account of events',
          'How the situation has affected you',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Welsh councils follow a standard two-stage complaints process',
      'Your local councillor can sometimes help',
      'Citizens Advice Cymru can provide free support',
      'Keep records of all correspondence'
    ],
    legislation: 'Public Services Ombudsman (Wales) Act 2019, Local Government Act 2000'
  },

  police_wales: {
    title: 'Police Complaint (Wales)',
    description: 'Complaints about police officer conduct in a Welsh police force.',
    timeLimit: '12 months from the incident',
    timeLimitDetail: 'You should complain within 12 months. The force has discretion to extend this.',
    preRequirements: [
      'You can complain directly to the force, at any police station, or through the IOPC',
      'For less serious issues, local resolution may be offered'
    ],
    evidenceGuidance: [
      'Officer name(s), collar/shoulder number(s), rank if known',
      'Date, time, and location of the incident',
      'Crime reference number or custody record number',
      'Names and contact details of witnesses',
      'Photographs of any injuries',
      'Your own written account'
    ],
    warnings: [
      'Serious matters (death, serious injury, corruption) may be referred directly to the IOPC'
    ],
    steps: [
      {
        name: 'Complain to the Police Force',
        description: 'Contact the force\'s Professional Standards Department.',
        timeline: 'Usually within 10-15 working days for initial response',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.police.uk/',
        postalAddress: 'Professional Standards Department, [Force Name], [Force HQ Address]',
        acknowledgmentTimeline: '15 working days',
        escalationTrigger: 'If you are unhappy with how your complaint was handled',
        infoNeeded: [
          'Your full name, address, and contact details',
          'Date, time, and location of the incident',
          'Name(s) or description(s) of officer(s)',
          'Detailed account of what happened',
          'Any reference numbers'
        ]
      },
      {
        name: 'Independent Office for Police Conduct (IOPC)',
        description: 'If unhappy with how your complaint was handled, request a review from the IOPC.',
        timeline: 'Varies; complex investigations can take months',
        contactEmail: 'enquiries@policeconduct.gov.uk',
        portalUrl: 'https://www.policeconduct.gov.uk/complaints/make-a-complaint',
        postalAddress: 'IOPC, 10 South Colonnade, Canary Wharf, London E14 4PU',
        acknowledgmentTimeline: '15 working days',
        escalationTrigger: 'The IOPC review is the final stage',
        infoNeeded: [
          'Copy of the force\'s response',
          'Why you are unhappy with the handling',
          'Any new evidence'
        ]
      }
    ],
    tips: [
      'Wales has four police forces: South Wales, North Wales, Dyfed-Powys, and Gwent',
      'The IOPC covers police complaints in England and Wales',
      'You can also contact your Police and Crime Commissioner',
      'Ask the force to preserve body-worn camera footage'
    ],
    legislation: 'Police Reform Act 2002, Police (Complaints and Misconduct) Regulations 2020'
  },

  social_care_wales: {
    title: 'Social Care Complaint (Wales)',
    description: 'Complaints about care homes, home care, or social services in Wales.',
    timeLimit: '12 months from the event',
    timeLimitDetail: 'The PSOW expects complaints within 12 months of the event or of becoming aware of the issue.',
    preRequirements: [
      'Try raising the issue directly with the care provider first',
      'If the person is at immediate risk, contact adult safeguarding at your local council'
    ],
    evidenceGuidance: [
      'Care plan documents',
      'Dates of specific incidents',
      'Names of care workers involved if known',
      'Photographs or relevant evidence',
      'Correspondence with the care provider'
    ],
    warnings: [
      'If someone is at immediate risk, contact the local authority safeguarding team or call 999'
    ],
    steps: [
      {
        name: 'Complain to the Care Provider',
        description: 'Raise your concern directly with the care home or home care provider.',
        timeline: 'Usually within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.careinspectorate.wales/',
        postalAddress: '[Care Provider Name], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If the provider does not resolve your concern',
        infoNeeded: [
          'Name of the person receiving care',
          'Your relationship to them',
          'Dates and details of incidents',
          'What outcome you want'
        ]
      },
      {
        name: 'Local Authority Social Services Complaints',
        description: 'If the care is commissioned by the council, complain through their social services complaints procedure.',
        timeline: 'Follows the council\'s two-stage process',
        contactEmail: null,
        portalUrl: null,
        postalAddress: 'Social Services Complaints, [Council Name], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If the council\'s process doesn\'t resolve your complaint',
        infoNeeded: [
          'Full details including dates',
          'Name of the person receiving care and their consent',
          'Previous complaint correspondence'
        ]
      },
      {
        name: 'Public Services Ombudsman for Wales (PSOW)',
        description: 'If the council process doesn\'t resolve your complaint, escalate to the PSOW.',
        timeline: 'Investigation can take several months',
        contactEmail: 'ask@ombudsman.wales',
        portalUrl: 'https://www.ombudsman.wales/make-a-complaint/',
        postalAddress: 'Public Services Ombudsman for Wales, 1 Ffordd yr Hen Gae, Pencoed CF35 5LJ',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PSOW is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of why the response was unsatisfactory',
          'How the situation has affected the person',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Report serious safety concerns to Care Inspectorate Wales (CIW)',
      'Age Cymru and Llais can provide advocacy support',
      'Keep a diary of incidents with dates and details'
    ],
    legislation: 'Public Services Ombudsman (Wales) Act 2019, Social Services and Well-being (Wales) Act 2014'
  },

  // ── Northern Ireland Pathways ──

  nhs_trust_ni: {
    title: 'Health & Social Care Complaint (Northern Ireland)',
    description: 'Complaints about care received at an HSC trust in Northern Ireland.',
    timeLimit: '6 months from the event or from when you became aware of the issue',
    timeLimitDetail: 'The Northern Ireland Ombudsman expects complaints within 6 months of the trust\'s final response. The trust itself expects complaints within 12 months of the event, but may accept late complaints at its discretion.',
    preRequirements: [
      'Complain to the HSC trust directly first',
      'The trust must respond before you can escalate to the NI Ombudsman'
    ],
    evidenceGuidance: [
      'Dates of appointments, admissions, and discharges',
      'Names of staff involved if known',
      'Ward or department name',
      'Health and Care Number (HCN)',
      'Copies of any correspondence',
      'A timeline of events in your own words'
    ],
    warnings: [],
    steps: [
      {
        name: 'Formal Complaint to the HSC Trust',
        description: 'Write a formal complaint to the HSC trust\'s complaints department.',
        timeline: 'Acknowledgment within 2 working days; response usually within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://online.hscni.net/',
        postalAddress: 'Complaints Department, [HSC Trust Name], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If you are unhappy with the trust\'s final response',
        infoNeeded: [
          'Full name and contact details',
          'Health and Care Number if available',
          'Date(s) of treatment or events',
          'Ward, department, or clinic name',
          'Clear description of what went wrong',
          'What outcome you want'
        ]
      },
      {
        name: 'Northern Ireland Public Services Ombudsman (NIPSO)',
        description: 'If unhappy with the trust\'s response, escalate to NIPSO.',
        timeline: 'Investigation can take several months',
        contactEmail: 'nipso@nipso.org.uk',
        portalUrl: 'https://nipso.org.uk/complain',
        postalAddress: 'NIPSO, Progressive House, 33 Wellington Place, Belfast BT1 6HN',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'NIPSO is the final stage',
        infoNeeded: [
          'Copy of the trust\'s final complaint response',
          'Your account of what happened',
          'How the situation has affected you',
          'What you want NIPSO to achieve'
        ]
      }
    ],
    tips: [
      'The Patient and Client Council (PCC) provides free advocacy for health complaints in NI',
      'Professional conduct issues can be reported to the GMC, NMC, or relevant regulator',
      'Keep copies of everything you send and receive'
    ],
    legislation: 'Health and Social Care (Reform) Act (Northern Ireland) 2009, Commissioner for Complaints (NI) Order 1996'
  },

  gp_ni: {
    title: 'GP Surgery Complaint (Northern Ireland)',
    description: 'Complaints about care from your GP surgery in Northern Ireland.',
    timeLimit: '6 months from the final response to escalate to NIPSO',
    timeLimitDetail: 'Complain to the GP practice within 12 months of the event. NIPSO expects referrals within 6 months of the final response.',
    preRequirements: [
      'Complain to the GP practice directly first',
      'You can also contact the HSC Board for assistance'
    ],
    evidenceGuidance: [
      'Date(s) of the appointment(s)',
      'Name of the GP or staff member if known',
      'Health and Care Number',
      'Copies of any letters or test results',
      'Notes of what was said during consultations'
    ],
    warnings: [],
    steps: [
      {
        name: 'Complain to the GP Practice',
        description: 'Write to the practice manager.',
        timeline: 'Response usually within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://online.hscni.net/',
        postalAddress: 'Practice Manager, [Surgery Name], [Surgery Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If you are unhappy with the practice\'s response',
        infoNeeded: [
          'Your full name and contact details',
          'Health and Care Number',
          'Date(s) of the appointment(s)',
          'Description of what happened',
          'What outcome you want'
        ]
      },
      {
        name: 'Northern Ireland Public Services Ombudsman (NIPSO)',
        description: 'Final escalation if local resolution fails.',
        timeline: 'Investigation can take several months',
        contactEmail: 'nipso@nipso.org.uk',
        portalUrl: 'https://nipso.org.uk/complain',
        postalAddress: 'NIPSO, Progressive House, 33 Wellington Place, Belfast BT1 6HN',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'NIPSO is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of events',
          'How the situation affected you',
          'What you want NIPSO to achieve'
        ]
      }
    ],
    tips: [
      'The Patient and Client Council (PCC) can help with complaints in NI',
      'If a GP\'s fitness to practise is in question, report to the GMC',
      'Keep copies of all correspondence'
    ],
    legislation: 'Health and Social Care (Reform) Act (NI) 2009, Commissioner for Complaints (NI) Order 1996'
  },

  council_ni: {
    title: 'Council Services Complaint (Northern Ireland)',
    description: 'Complaints about Northern Ireland council services.',
    timeLimit: '6 months from the final response to escalate to NIPSO',
    timeLimitDetail: 'Complain to the council first. NIPSO expects referrals within 6 months of the council\'s final response.',
    preRequirements: [
      'You must complete the council\'s internal complaints process before going to NIPSO',
      'Contact the relevant department first'
    ],
    evidenceGuidance: [
      'Reference numbers for council services',
      'Dates of contact with the council',
      'Copies of letters, emails, or online messages',
      'Names of council officers you dealt with'
    ],
    warnings: [],
    steps: [
      {
        name: 'Council Complaints Procedure',
        description: 'Submit a formal complaint to the council. Most NI councils have an online complaints form.',
        timeline: 'Response usually within 15-20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.nidirect.gov.uk/contacts/local-councils-in-northern-ireland',
        postalAddress: 'Complaints Team, [Council Name], [Address]',
        acknowledgmentTimeline: '3 working days',
        escalationTrigger: 'If you are unhappy with the council\'s response',
        infoNeeded: [
          'Full name, address, and contact details',
          'Service area the complaint relates to',
          'What happened and when',
          'What outcome you want'
        ]
      },
      {
        name: 'Northern Ireland Public Services Ombudsman (NIPSO)',
        description: 'Once you\'ve exhausted the council\'s process, NIPSO can investigate.',
        timeline: 'Investigation can take several months',
        contactEmail: 'nipso@nipso.org.uk',
        portalUrl: 'https://nipso.org.uk/complain',
        postalAddress: 'NIPSO, Progressive House, 33 Wellington Place, Belfast BT1 6HN',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'NIPSO is the final stage',
        infoNeeded: [
          'Copy of the council\'s final complaint response',
          'Your account of events',
          'How the situation has affected you',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Northern Ireland has 11 councils',
      'Your local councillor can sometimes help',
      'Advice NI can provide free support',
      'Keep records of all correspondence'
    ],
    legislation: 'Commissioner for Complaints (NI) Order 1996, Local Government Act (Northern Ireland) 2014'
  },

  police_ni: {
    title: 'PSNI Complaint (Northern Ireland)',
    description: 'Complaints about PSNI officer conduct, decisions, or service.',
    timeLimit: '12 months from the incident',
    timeLimitDetail: 'You should complain within 12 months. The Police Ombudsman has discretion to extend this.',
    preRequirements: [
      'In Northern Ireland, police complaints go to the Police Ombudsman, not the force itself',
      'The Police Ombudsman for Northern Ireland is independent of the PSNI'
    ],
    evidenceGuidance: [
      'Officer name(s), service number(s), rank if known',
      'Date, time, and location of the incident',
      'Crime reference number or custody record number',
      'Names and contact details of witnesses',
      'Photographs of any injuries',
      'Your own written account'
    ],
    warnings: [
      'In NI, complaints about police go directly to the Police Ombudsman — not to the PSNI itself'
    ],
    steps: [
      {
        name: 'Police Ombudsman for Northern Ireland',
        description: 'Submit your complaint directly to the Police Ombudsman. They investigate all complaints about PSNI officers independently.',
        timeline: 'Varies by complexity; they will explain the expected timeline',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.policeombudsman.org/Make-a-Complaint',
        postalAddress: 'Police Ombudsman for Northern Ireland, New Cathedral Buildings, 11 Church Street, Belfast BT1 1PG',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'If you are unhappy with the Ombudsman\'s findings, you may seek judicial review',
        infoNeeded: [
          'Your full name, address, and contact details',
          'Date, time, and location of the incident',
          'Name(s) or description(s) of officer(s)',
          'Detailed account of what happened',
          'Any reference numbers'
        ]
      }
    ],
    tips: [
      'The Police Ombudsman is independent — complaints do not go through the PSNI',
      'You can make a complaint in person, by phone, by email, or online',
      'The Ombudsman can investigate current and historical complaints',
      'You can get free legal advice from a solicitor specialising in police complaints'
    ],
    legislation: 'Police (Northern Ireland) Act 1998, Police (Northern Ireland) Act 2000'
  },

  social_care_ni: {
    title: 'Social Care Complaint (Northern Ireland)',
    description: 'Complaints about care homes, home care, or HSC trust social services in Northern Ireland.',
    timeLimit: '6 months from the final response to escalate to NIPSO',
    timeLimitDetail: 'Complain to the HSC trust or care provider first. NIPSO expects referrals within 6 months of the final response.',
    preRequirements: [
      'Try raising the issue directly with the care provider or HSC trust first',
      'If the person is at immediate risk, contact adult safeguarding'
    ],
    evidenceGuidance: [
      'Care plan documents',
      'Dates of specific incidents',
      'Names of care workers involved if known',
      'Photographs or relevant evidence',
      'Correspondence with the care provider'
    ],
    warnings: [
      'If someone is at immediate risk, contact the HSC trust adult safeguarding team or call 999'
    ],
    steps: [
      {
        name: 'Complain to the Care Provider or HSC Trust',
        description: 'Raise your concern with the care provider or the HSC trust\'s complaints department.',
        timeline: 'Usually within 20 working days',
        current: true,
        contactEmail: null,
        portalUrl: 'https://www.rqia.org.uk/services/',
        postalAddress: '[Care Provider Name / HSC Trust], [Address]',
        acknowledgmentTimeline: '2 working days',
        escalationTrigger: 'If the provider or trust does not resolve your concern',
        infoNeeded: [
          'Name of the person receiving care',
          'Your relationship to them',
          'Dates and details of incidents',
          'What outcome you want'
        ]
      },
      {
        name: 'Northern Ireland Public Services Ombudsman (NIPSO)',
        description: 'If the provider/trust process doesn\'t resolve your complaint, escalate to NIPSO.',
        timeline: 'Investigation can take several months',
        contactEmail: 'nipso@nipso.org.uk',
        portalUrl: 'https://nipso.org.uk/complain',
        postalAddress: 'NIPSO, Progressive House, 33 Wellington Place, Belfast BT1 6HN',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'NIPSO is the final stage',
        infoNeeded: [
          'Copy of the final complaint response',
          'Your account of why the response was unsatisfactory',
          'How the situation has affected the person',
          'What outcome you want'
        ]
      }
    ],
    tips: [
      'Report serious safety concerns to the Regulation and Quality Improvement Authority (RQIA)',
      'The Patient and Client Council can provide advocacy support',
      'Keep a diary of incidents with dates and details'
    ],
    legislation: 'Health and Social Care (Reform) Act (NI) 2009, Commissioner for Complaints (NI) Order 1996'
  },

  other_gov: {
    title: 'Government Body Complaint',
    description: 'Complaints about other government departments or agencies.',
    timeLimit: '12 months is a general guideline (the PHSO expects complaints within 12 months)',
    timeLimitDetail: 'Most government bodies do not have a strict statutory time limit for complaints, but the PHSO expects complaints to be referred within 12 months. Individual departments may set their own deadlines.',
    preRequirements: [
      'You must complain to the government department directly first and complete their internal complaints process',
      'Check the department\'s website for their specific complaints procedure'
    ],
    evidenceGuidance: [
      'Any reference numbers for your case or application',
      'Dates of contact and what was discussed',
      'Copies of letters, emails, or online communications',
      'Names of staff you dealt with if known',
      'Details of any financial loss or other impact'
    ],
    warnings: [],
    steps: [
      {
        name: 'Department\'s Own Complaints Procedure',
        description: 'Most government bodies have their own complaints process. Check their website or contact them directly.',
        timeline: 'Usually within 15-20 working days',
        current: true,
        contactEmail: null,
        portalUrl: null,
        postalAddress: null,
        acknowledgmentTimeline: '3-5 working days',
        escalationTrigger: 'If you are unhappy with the department\'s response',
        infoNeeded: [
          'Full name and contact details',
          'Any reference numbers',
          'Clear description of the problem',
          'Dates and details of events',
          'What outcome you want'
        ]
      },
      {
        name: 'Parliamentary and Health Service Ombudsman (PHSO)',
        description: 'For UK government departments, you can escalate to the PHSO via your MP.',
        timeline: 'Investigation can take several months',
        contactEmail: 'phso.enquiries@ombudsman.org.uk',
        portalUrl: 'https://www.ombudsman.org.uk/making-complaint',
        postalAddress: 'Parliamentary and Health Service Ombudsman, Millbank Tower, Millbank, London SW1P 4QP',
        acknowledgmentTimeline: '5 working days',
        escalationTrigger: 'The PHSO is the final stage',
        infoNeeded: [
          'Copy of the department\'s final complaint response',
          'Your account of events and why the response was unsatisfactory',
          'How the situation has affected you personally',
          'What remedy you are seeking',
          'Your MP must refer the complaint'
        ]
      }
    ],
    tips: [
      'Contact your MP — they can raise your complaint directly with the department',
      'Check whether the body has a specific regulator or independent complaints mechanism',
      'Citizens Advice can help identify the right complaint route',
      'Keep copies of all correspondence'
    ],
    legislation: 'Varies by department and issue'
  }
};

/**
 * Get the complaint pathway for a given body type.
 * For DWP, the complaintType parameter determines which pathway to return.
 * For devolved nations (Scotland, Wales, Northern Ireland), returns nation-specific pathway if available.
 *
 * @param {string} bodyType - The type of public body
 * @param {string} [complaintType] - Optional: 'decision' or 'service' (used for DWP)
 * @param {string} [nation] - Optional: 'England', 'Scotland', 'Wales', or 'Northern Ireland'
 * @returns {Pathway|null}
 */
export function getPathway(bodyType, complaintType, nation) {
  // DWP/HMRC are UK-wide — no nation variant
  if (bodyType === 'dwp' && complaintType) {
    if (complaintType === 'decision') {
      return PATHWAYS.dwp_decision;
    }
    if (complaintType === 'service') {
      return PATHWAYS.dwp_service;
    }
  }

  // Check for nation-specific pathway
  if (nation && nation !== 'England') {
    const nationKey = { Scotland: 'scotland', Wales: 'wales', 'Northern Ireland': 'ni' }[nation];
    if (nationKey) {
      const nationPathway = PATHWAYS[`${bodyType}_${nationKey}`];
      if (nationPathway) return nationPathway;
    }
  }

  return PATHWAYS[bodyType] || PATHWAYS.other_gov;
}

/**
 * Determine if steps have already been taken and adjust the current step marker.
 *
 * @param {Pathway} pathway
 * @param {string} stepsTaken - Description of actions already taken
 * @returns {Pathway} Pathway with adjusted current markers
 */
export function adjustForStepsTaken(pathway, stepsTaken) {
  if (!stepsTaken || stepsTaken.toLowerCase() === 'none' || stepsTaken.toLowerCase() === 'no') {
    return pathway;
  }

  const lower = stepsTaken.toLowerCase();
  const adjusted = JSON.parse(JSON.stringify(pathway)); // deep clone

  // Remove all current markers first
  adjusted.steps.forEach(s => { s.current = false; });

  // Try to figure out where they are in the process
  let foundStep = false;
  for (let i = 0; i < adjusted.steps.length; i++) {
    const stepName = adjusted.steps[i].name.toLowerCase();
    if (lower.includes('ombudsman') || lower.includes('phso') || lower.includes('lgsco') || lower.includes('iopc')) {
      // Already at final escalation
      adjusted.steps[adjusted.steps.length - 1].current = true;
      foundStep = true;
      break;
    }
    if (lower.includes('formal') || lower.includes('written') || lower.includes('complained') || lower.includes('stage 2') || lower.includes('tier 2')) {
      // Past stage 1 — set next step as current
      if (i < adjusted.steps.length - 1) {
        adjusted.steps[i + 1].current = true;
      } else {
        adjusted.steps[i].current = true;
      }
      foundStep = true;
      break;
    }
    if (lower.includes('pals') || lower.includes('spoke') || lower.includes('called') || lower.includes('mentioned') || lower.includes('raised') || lower.includes('tried')) {
      // Done informal — mark formal as current
      if (adjusted.steps.length > 1) {
        adjusted.steps[1].current = true;
      } else {
        adjusted.steps[0].current = true;
      }
      foundStep = true;
      break;
    }
  }

  if (!foundStep) {
    // Default to first step
    adjusted.steps[0].current = true;
  }

  return adjusted;
}

/**
 * Get all supported body types for reference.
 * @returns {string[]}
 */
export function getSupportedBodyTypes() {
  return Object.keys(PATHWAYS);
}
