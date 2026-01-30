// Chat UI components & application controller
// Manages the full flow: landing → chat → summary → pathway → letter

import { sendMessage, generateOnce } from './gemini.js';
import { INTAKE_SYSTEM_PROMPT, extractFacts, getDisplayText } from './intake.js';
import { getPathway, adjustForStepsTaken } from './router.js';

// ── State ──

let conversationHistory = []; // {role: 'user'|'model', text: string}
let extractedFacts = null;
let currentPathway = null;
let isSending = false;
let autoReadEnabled = false;
let currentUtterance = null; // active SpeechSynthesis utterance
let recognition = null; // SpeechRecognition instance
let isRecording = false;

// ── DOM References ──

const $ = (sel) => document.querySelector(sel);
const landing = $('#landing');
const chatContainer = $('#chat-container');
const letterContainer = $('#letter-container');
const messagesEl = $('#chat-messages');
const inputEl = $('#chat-input');
const sendBtn = $('#chat-send');
const typingIndicator = $('#typing-indicator');
const toast = $('#toast');

// ── Feature Detection ──

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesisSupported = 'speechSynthesis' in window;

// ── Initialisation ──

export function init() {
  // Landing page events
  $('#start-btn').addEventListener('click', handleStart);

  // Chat events
  $('#chat-back').addEventListener('click', handleBackToLanding);
  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Letter events
  $('#letter-back').addEventListener('click', handleBackToChat);
  $('#letter-copy').addEventListener('click', handleCopyLetter);
  $('#letter-download-pdf').addEventListener('click', () => handleDownloadLetter('pdf'));
  $('#letter-download-docx').addEventListener('click', () => handleDownloadLetter('docx'));

  // Voice input (mic button)
  initVoiceInput();

  // Auto-read toggle
  initAutoReadToggle();
}

// ── Voice Input (Speech-to-Text) ──

function initVoiceInput() {
  const micBtn = $('#chat-mic');
  if (!SpeechRecognition || !micBtn) {
    // Hide mic button if unsupported
    if (micBtn) micBtn.style.display = 'none';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-GB';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    // Show live transcription in the input
    if (final) {
      inputEl.value = final;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    } else if (interim) {
      inputEl.value = interim;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    }
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
  };

  recognition.onerror = (event) => {
    isRecording = false;
    micBtn.classList.remove('recording');
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      showToast('Voice input error: ' + event.error);
    }
  };

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
      isRecording = false;
      micBtn.classList.remove('recording');
    } else {
      inputEl.value = '';
      recognition.start();
      isRecording = true;
      micBtn.classList.add('recording');
    }
  });
}

// ── Auto-Read Toggle ──

function initAutoReadToggle() {
  const toggle = $('#auto-read-toggle');
  if (!speechSynthesisSupported || !toggle) {
    if (toggle) toggle.style.display = 'none';
    return;
  }

  toggle.addEventListener('click', () => {
    autoReadEnabled = !autoReadEnabled;
    toggle.classList.toggle('active', autoReadEnabled);
  });
}

// ── Text-to-Speech ──

function speakText(text) {
  if (!speechSynthesisSupported) return;

  // Cancel any current speech
  window.speechSynthesis.cancel();

  // Strip HTML/markdown for clean reading
  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-GB';
  utterance.rate = 0.95;

  // Prefer en-GB voice
  const voices = window.speechSynthesis.getVoices();
  const gbVoice = voices.find(v => v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en'));
  if (gbVoice) utterance.voice = gbVoice;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

function createSpeakButton(text) {
  if (!speechSynthesisSupported) return null;

  const btn = document.createElement('button');
  btn.className = 'message__speak-btn';
  btn.setAttribute('aria-label', 'Read message aloud');
  btn.title = 'Read aloud';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`;

  btn.addEventListener('click', () => {
    if (btn.classList.contains('speaking')) {
      window.speechSynthesis.cancel();
      btn.classList.remove('speaking');
      return;
    }

    // Remove speaking class from all other buttons
    document.querySelectorAll('.message__speak-btn.speaking').forEach(b => b.classList.remove('speaking'));

    const utterance = speakText(text);
    if (utterance) {
      btn.classList.add('speaking');
      utterance.onend = () => btn.classList.remove('speaking');
      utterance.onerror = () => btn.classList.remove('speaking');
    }
  });

  return btn;
}

// ── Navigation ──

function showLanding() {
  landing.classList.remove('hidden');
  chatContainer.classList.remove('active');
  letterContainer.classList.remove('active');
}

function showChat() {
  landing.classList.add('hidden');
  chatContainer.classList.add('active');
  letterContainer.classList.remove('active');
  inputEl.focus();
}

function showLetter() {
  landing.classList.add('hidden');
  chatContainer.classList.remove('active');
  letterContainer.classList.add('active');
}

// ── Chat Flow ──

function handleStart() {
  // Reset state
  conversationHistory = [];
  extractedFacts = null;
  currentPathway = null;
  messagesEl.innerHTML = '';
  messagesEl.appendChild(typingIndicator);

  showChat();

  // Send initial empty message to get the greeting
  sendInitialGreeting();
}

async function sendInitialGreeting() {
  setTyping(true);
  try {
    const response = await sendMessage(
      INTAKE_SYSTEM_PROMPT,
      [],
      'Hello, I need help making a complaint.'
    );
    // Add both sides to history
    conversationHistory.push({ role: 'user', text: 'Hello, I need help making a complaint.' });
    conversationHistory.push({ role: 'model', text: response });
    // Only show the AI greeting (not the synthetic user message)
    addMessage('ai', getDisplayText(response));
  } catch (err) {
    addMessage('error', err.message);
  } finally {
    setTyping(false);
  }
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text || isSending) return;

  // Show user message
  addMessage('user', text);
  inputEl.value = '';
  inputEl.style.height = 'auto';

  isSending = true;
  sendBtn.disabled = true;
  setTyping(true);

  try {
    const response = await sendMessage(
      INTAKE_SYSTEM_PROMPT,
      conversationHistory,
      text
    );

    // Add to history
    conversationHistory.push({ role: 'user', text });
    conversationHistory.push({ role: 'model', text: response });

    // Check for fact extraction
    const facts = extractFacts(response);
    const displayText = getDisplayText(response);

    addMessage('ai', displayText);

    if (facts) {
      extractedFacts = facts;
      showSummaryCard(facts);
    }
  } catch (err) {
    addMessage('error', err.message);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    setTyping(false);
    inputEl.focus();
  }
}

// ── Message Rendering ──

function addMessage(type, text) {
  const div = document.createElement('div');
  div.className = `message message--${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'log');

  // Basic markdown-ish rendering
  div.innerHTML = renderMarkdown(text);

  // Add speak button to AI messages
  if (type === 'ai') {
    const speakBtn = createSpeakButton(text);
    if (speakBtn) div.appendChild(speakBtn);

    // Auto-read if enabled
    if (autoReadEnabled) {
      // Small delay to let the message render
      setTimeout(() => speakText(text), 200);
    }
  }

  // Insert before typing indicator so it stays at the bottom
  messagesEl.insertBefore(div, typingIndicator);
  scrollToBottom();
}

function renderMarkdown(text) {
  // Simple markdown: bold, italic, line breaks, lists
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function setTyping(active) {
  typingIndicator.classList.toggle('active', active);
  if (active) scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// ── Summary Card ──

function showSummaryCard(facts) {
  const card = document.createElement('div');
  card.className = 'summary-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Complaint summary');

  // Build warnings
  let warnings = '';

  // Time limit warning
  if (facts.withinTimeLimit === 'at_risk') {
    warnings += `<div class="summary-card__warning summary-card__warning--time">
      <span class="summary-card__warning-icon">&#9888;</span>
      <span>Your complaint may be approaching the time limit. It is important to act quickly.</span>
    </div>`;
  } else if (facts.withinTimeLimit === 'no') {
    warnings += `<div class="summary-card__warning summary-card__warning--time-expired">
      <span class="summary-card__warning-icon">&#9888;</span>
      <span>This may be outside the standard time limit. Extensions are sometimes possible — it is still worth trying, but be aware the body may decline to investigate.</span>
    </div>`;
  }

  // Legal proceedings warning
  if (facts.legalActionStatus === 'underway') {
    warnings += `<div class="summary-card__warning summary-card__warning--legal">
      <span class="summary-card__warning-icon">&#9888;</span>
      <span>You have indicated legal action is underway. Some bodies (including the PHSO) will not investigate while legal proceedings are active.</span>
    </div>`;
  } else if (facts.legalActionStatus === 'planned') {
    warnings += `<div class="summary-card__warning summary-card__warning--legal">
      <span class="summary-card__warning-icon">&#9888;</span>
      <span>If you begin legal action, some complaint bodies may pause or decline their investigation. Consider the complaints process first.</span>
    </div>`;
  }

  // Third-party consent reminder
  if (facts.thirdParty) {
    warnings += `<div class="summary-card__warning summary-card__warning--consent">
      <span class="summary-card__warning-icon">&#9993;</span>
      <span>You are complaining on behalf of ${facts.thirdPartyName ? escapeHtml(facts.thirdPartyName) : 'someone else'}. You will need their written consent to proceed.</span>
    </div>`;
  }

  // Build fields — show all available fields
  const fields = [
    { label: 'Public Body', value: facts.publicBody },
    { label: 'Service', value: facts.service },
    { label: 'Issue', value: facts.issue },
    { label: 'When', value: facts.dateRange },
    { label: 'Time Limit Status', value: formatTimeLimit(facts.withinTimeLimit), alert: facts.withinTimeLimit === 'at_risk' || facts.withinTimeLimit === 'no' },
    { label: 'Severity', value: facts.severity },
    { label: 'Personal Impact', value: facts.personalImpact },
    { label: 'Desired Outcome', value: facts.desiredOutcome },
    { label: 'Steps Taken', value: facts.stepsTaken },
    { label: 'Tried Direct Resolution', value: formatYesNo(facts.triedDirectResolution) },
    { label: 'Complaint Type', value: formatComplaintType(facts.complaintType) },
    { label: 'Complaining on Behalf of', value: facts.thirdParty ? (facts.thirdPartyName || 'Someone else') : null },
    { label: 'Reference Numbers', value: facts.referenceNumbers },
    { label: 'Staff Involved', value: facts.staffInvolved },
    { label: 'Legal Action', value: formatLegalStatus(facts.legalActionStatus) },
    { label: 'Contact Preference', value: formatContactPref(facts.contactPreference) }
  ];

  card.innerHTML = `
    <div class="summary-card__title">Your Complaint Summary</div>
    ${warnings}
    ${fields.map(f => f.value ? `
      <div class="summary-card__field">
        <div class="summary-card__label">${f.label}</div>
        <div class="summary-card__value${f.alert ? ' summary-card__alert-value' : ''}">${escapeHtml(f.value)}</div>
      </div>
    ` : '').join('')}
    <div class="summary-card__actions">
      <button class="btn btn--primary" id="confirm-summary">Looks correct — show me the pathway</button>
      <button class="btn btn--secondary" id="edit-summary">I need to add/change something</button>
    </div>
  `;

  messagesEl.insertBefore(card, typingIndicator);
  scrollToBottom();

  // Button handlers
  card.querySelector('#confirm-summary').addEventListener('click', () => handleConfirmSummary());
  card.querySelector('#edit-summary').addEventListener('click', () => {
    addMessage('system', 'No problem — just type what you\'d like to add or change, and I\'ll update the summary.');
    inputEl.focus();
  });
}

// ── Summary Card Formatters ──

function formatTimeLimit(status) {
  if (!status || status === 'unknown') return null;
  const labels = {
    yes: 'Within time limit',
    at_risk: 'Approaching time limit — act soon',
    no: 'May be outside time limit'
  };
  return labels[status] || null;
}

function formatYesNo(val) {
  if (!val || val === 'unknown') return null;
  return val === 'yes' ? 'Yes' : 'No';
}

function formatComplaintType(type) {
  if (!type || type === 'general') return null;
  const labels = { decision: 'Challenging a decision', service: 'Service complaint' };
  return labels[type] || null;
}

function formatLegalStatus(status) {
  if (!status || status === 'none' || status === 'unknown') return null;
  const labels = { planned: 'Legal action planned', underway: 'Legal action underway' };
  return labels[status] || null;
}

function formatContactPref(pref) {
  if (!pref || pref === 'not_stated') return null;
  const labels = { email: 'Email', phone: 'Phone', letter: 'Letter' };
  return labels[pref] || null;
}

function handleConfirmSummary() {
  if (!extractedFacts) return;

  // Get pathway — pass complaintType for DWP routing
  const pathway = getPathway(extractedFacts.bodyType, extractedFacts.complaintType);
  currentPathway = adjustForStepsTaken(pathway, extractedFacts.stepsTaken);

  showPathwayCard(currentPathway);
}

// ── Pathway Card ──

function showPathwayCard(pathway) {
  const card = document.createElement('div');
  card.className = 'pathway-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Recommended complaint pathway');

  // Time limit banner
  let timeLimitBanner = '';
  if (pathway.timeLimit) {
    let bannerClass = 'pathway-time-limit';
    let icon = '&#128339;'; // clock
    if (extractedFacts && extractedFacts.withinTimeLimit === 'at_risk') {
      bannerClass += ' pathway-time-limit--at-risk';
      icon = '&#9888;'; // warning
    } else if (extractedFacts && extractedFacts.withinTimeLimit === 'no') {
      bannerClass += ' pathway-time-limit--expired';
      icon = '&#9888;';
    }
    timeLimitBanner = `
      <div class="${bannerClass}">
        <span class="pathway-time-limit__icon">${icon}</span>
        <div class="pathway-time-limit__text">
          <div class="pathway-time-limit__title">Time limit: ${escapeHtml(pathway.timeLimit)}</div>
          ${pathway.timeLimitDetail ? `<div class="pathway-time-limit__detail">${escapeHtml(pathway.timeLimitDetail)}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Warnings section
  let warningsHtml = '';
  if (pathway.warnings && pathway.warnings.length > 0) {
    warningsHtml = `
      <div class="pathway-warnings">
        ${pathway.warnings.map(w => `
          <div class="pathway-warning">
            <span class="pathway-warning__icon">&#9888;</span>
            <span>${escapeHtml(w)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Pre-requirements section
  let prereqsHtml = '';
  if (pathway.preRequirements && pathway.preRequirements.length > 0) {
    prereqsHtml = `
      <div class="pathway-prereqs">
        <div class="pathway-prereqs__title">Before You Start</div>
        <ul class="pathway-prereqs__list">
          ${pathway.preRequirements.map(p => `<li class="pathway-prereqs__item">${escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Build steps with enhanced info
  const stepsHtml = pathway.steps.map(step => {
    let infoNeededHtml = '';
    if (step.current && step.infoNeeded && step.infoNeeded.length > 0) {
      infoNeededHtml = `
        <div class="pathway-info-needed">
          <div class="pathway-info-needed__title">Information You Will Need</div>
          <ul class="pathway-info-needed__list">
            ${step.infoNeeded.map(info => `<li class="pathway-info-needed__item">${escapeHtml(info)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return `
      <li class="pathway-step ${step.current ? 'pathway-step--current' : ''}">
        <div class="pathway-step__name">${escapeHtml(step.name)}</div>
        <div class="pathway-step__desc">${escapeHtml(step.description)}</div>
        <div class="pathway-step__timeline">${escapeHtml(step.timeline)}</div>
        ${step.acknowledgmentTimeline ? `<div class="pathway-step__ack">Expected acknowledgment: ${escapeHtml(step.acknowledgmentTimeline)}</div>` : ''}
        ${step.escalationTrigger ? `<div class="pathway-step__escalation">Next step: ${escapeHtml(step.escalationTrigger)}</div>` : ''}
        ${infoNeededHtml}
      </li>
    `;
  }).join('');

  // Evidence guidance section
  let evidenceHtml = '';
  if (pathway.evidenceGuidance && pathway.evidenceGuidance.length > 0) {
    evidenceHtml = `
      <div class="pathway-evidence">
        <div class="pathway-evidence__title">Evidence to Gather</div>
        <ul class="pathway-evidence__list">
          ${pathway.evidenceGuidance.map(e => `<li class="pathway-evidence__item">${escapeHtml(e)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="pathway-card__title">${escapeHtml(pathway.title)}</div>
    <p style="font-size:0.9rem; color:var(--nhs-dark-grey); margin-bottom:1rem;">${escapeHtml(pathway.description)}</p>
    ${timeLimitBanner}
    ${warningsHtml}
    ${prereqsHtml}
    <ol class="pathway-steps">
      ${stepsHtml}
    </ol>
    ${evidenceHtml}
    ${pathway.tips.length > 0 ? `
      <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--nhs-pale-grey);">
        <div class="summary-card__label">Useful Tips</div>
        <ul style="font-size:0.85rem; color:var(--nhs-dark-grey); padding-left:1.25rem; margin-top:0.25rem;">
          ${pathway.tips.map(t => `<li style="margin-bottom:0.25rem;">${escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--nhs-grey);">
      <strong>Relevant legislation:</strong> ${escapeHtml(pathway.legislation)}
    </div>
    <div class="pathway-card__actions">
      <button class="btn btn--green" id="generate-letter">Draft my complaint</button>
      <button class="btn btn--secondary" id="continue-chat">I have more questions</button>
    </div>
  `;

  messagesEl.insertBefore(card, typingIndicator);
  scrollToBottom();

  card.querySelector('#generate-letter').addEventListener('click', () => handleGenerateLetter());
  card.querySelector('#continue-chat').addEventListener('click', () => {
    addMessage('system', 'Of course — ask me anything about your complaint or the process.');
    inputEl.focus();
  });
}

// ── Letter Generation ──

async function handleGenerateLetter() {
  if (!extractedFacts || !currentPathway) return;

  addMessage('system', 'Drafting your complaint...');
  setTyping(true);

  const letterPrompt = buildLetterPrompt(extractedFacts, currentPathway);

  try {
    const letter = await generateOnce(LETTER_SYSTEM_PROMPT, letterPrompt);
    showLetter();
    $('#letter-textarea').value = letter;
    renderNextStepsPanel();
  } catch (err) {
    addMessage('error', `Could not generate letter: ${err.message}`);
  } finally {
    setTyping(false);
  }
}

const LETTER_SYSTEM_PROMPT = `You write complaint text for UK citizens. The person will copy this into an online form, email it, or post it.

YOUR #1 RULE: Do NOT embellish, dramatise, or add anything the person did not say. Only include facts they actually told you. If they said "I waited a long time", do NOT upgrade that to "I endured an agonising and unacceptable wait". If they said "I was upset", do NOT write "I was left feeling devastated, anxious, and unable to sleep". Stick to their words.

BANNED PHRASES — never use any of these:
- "I am writing to formally lodge" / "formally raise" / "formal complaint"
- "pursuant to" / "in accordance with" / "under the provisions of"
- "I trust this matter will receive due consideration"
- "I wish to draw your attention to"
- "the aforementioned" / "as previously stated"
- "I would be grateful if you could"
- "please do not hesitate to contact me"
- "I feel compelled to" / "I have no choice but to"
- "deeply disappointed" / "utterly unacceptable" / "gravely concerned"
- "caused me significant distress and inconvenience"
- "falls far short of" / "fails to meet the standards"
- "left me feeling" followed by a long list of emotions
- "I respectfully request" / "I humbly ask"
- Any Latin phrases, legal jargon, or formal register words

USE phrases like these instead:
- "I want to complain about..."
- "What happened was..."
- "This affected me because..."
- "I would like you to..."
- "Please reply within..."
- "I want to know why..."
- "I am not happy with..."
- "This caused me [specific problem]..."
- "Can you please explain..."

STYLE:
- Write as a normal person would. Read it back — if it sounds like a lawyer or an AI wrote it, rewrite it.
- Short sentences. Short paragraphs. One point per paragraph.
- Only state emotions or impacts the person actually described. Do not invent or amplify them.
- Do not pad the text. Say what needs saying and stop. Aim for under 500 words.
- First person throughout. It should sound like the person talking.

FORMAT:
- Start with a subject line.
- Include [YOUR NAME], [YOUR ADDRESS], [DATE] placeholders.
- The text must work in an online form, an email, or a printed letter. Keep it flexible.

CONTENT:
- Say who you are and what the complaint is about up front.
- Describe what happened in order. Facts only.
- Say how it affected you — but only what the person actually said, not embellished versions.
- Say what you want to happen.
- Ask specific questions.
- Set a response deadline (20 working days for NHS, 15 for most others).
- Include reference numbers if provided.
- If complaining for someone else, mention consent.
- Briefly mention the right to complain but do not quote legislation.
- Output ONLY the complaint text. No commentary.
- Do not fabricate or embellish any details.`;

function buildLetterPrompt(facts, pathway) {
  const currentStep = pathway.steps.find(s => s.current) || pathway.steps[0];

  let prompt = `Write complaint text in plain, simple language based on these facts. The person may copy this into an online form, send it as an email, or post it as a letter — so keep the format flexible.

Public body: ${facts.publicBody}
Type: ${facts.bodyType}
Service: ${facts.service}
Issue: ${facts.issue}
Full details: ${facts.details}
When it happened: ${facts.dateRange}
Severity: ${facts.severity}
Personal impact: ${facts.personalImpact || 'Not specified'}
Desired outcome: ${facts.desiredOutcome}
Steps already taken: ${facts.stepsTaken || 'None'}
Tried direct resolution: ${facts.triedDirectResolution || 'Unknown'}`;

  if (facts.referenceNumbers) {
    prompt += `\nReference numbers: ${facts.referenceNumbers}`;
  }
  if (facts.staffInvolved) {
    prompt += `\nStaff involved: ${facts.staffInvolved}`;
  }
  if (facts.thirdParty) {
    prompt += `\nComplaining on behalf of: ${facts.thirdPartyName || 'another person'} (consent is available)`;
  }
  if (facts.contactPreference && facts.contactPreference !== 'not_stated') {
    prompt += `\nPreferred contact method: ${facts.contactPreference}`;
  }

  prompt += `\nAdditional notes: ${facts.additionalNotes || 'None'}

The complaint is directed to: ${currentStep.name}
Relevant pathway: ${pathway.title}
Legislation: ${pathway.legislation}

CRITICAL: Do NOT embellish. Only include facts the person actually stated above. Do not dramatise, exaggerate emotions, or add formal language. Write under 500 words. If it sounds like a lawyer wrote it, you have failed.`;

  return prompt;
}

// ── Next Steps / Submission Panel ──

function renderNextStepsPanel() {
  const container = $('#next-steps-container');
  if (!container || !currentPathway) return;

  const currentStep = currentPathway.steps.find(s => s.current) || currentPathway.steps[0];
  const { contactEmail, portalUrl, postalAddress } = currentStep;

  let sections = '';

  // Online portal
  if (portalUrl) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Submit Online</div>
        <div class="next-steps-panel__text">You can submit your complaint directly through the official online portal.</div>
        <div class="next-steps-panel__actions">
          <a href="${escapeHtml(portalUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--primary">Open complaint portal</a>
        </div>
      </div>
    `;
  }

  // Email send
  if (contactEmail) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Send by Email</div>
        <div class="next-steps-panel__text">Send your complaint directly to <strong>${escapeHtml(contactEmail)}</strong>.</div>
        <div class="next-steps-panel__actions">
          <button class="btn btn--primary" id="send-email-btn">Send by email</button>
        </div>
        <div id="email-status"></div>
      </div>
    `;
  }

  // Download section
  sections += `
    <div class="next-steps-panel__section">
      <div class="next-steps-panel__label">Download Your Complaint</div>
      <div class="next-steps-panel__text">Download your complaint text to attach to an email or print and post.</div>
      <div class="next-steps-panel__actions">
        <button class="btn btn--green" id="ns-download-pdf">Download PDF</button>
        <button class="btn btn--outline" id="ns-download-docx">Download Word</button>
      </div>
    </div>
  `;

  // Postal address
  if (postalAddress) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Send by Post</div>
        <div class="next-steps-panel__text">If posting, address it to:<br><strong>${escapeHtml(postalAddress)}</strong></div>
      </div>
    `;
  } else {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Send by Post</div>
        <div class="next-steps-panel__text">If posting, check the organisation's website for their complaints address. Send by recorded delivery so you have proof it was received.</div>
      </div>
    `;
  }

  // Evidence checklist (from pathway data)
  if (currentPathway && currentPathway.evidenceGuidance && currentPathway.evidenceGuidance.length > 0) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Evidence Preparation Checklist</div>
        <div class="next-steps-panel__text">Gather the following evidence to support your complaint:</div>
        <div class="evidence-checklist">
          <ul class="evidence-checklist__list">
            ${currentPathway.evidenceGuidance.map((item, i) => `
              <li class="evidence-checklist__item">
                <input type="checkbox" class="evidence-checklist__checkbox" id="evidence-${i}">
                <label for="evidence-${i}">${escapeHtml(item)}</label>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // Third-party consent reminder
  if (extractedFacts && extractedFacts.thirdParty) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="consent-reminder">
          <span class="consent-reminder__icon">&#9993;</span>
          <span>You are complaining on behalf of ${extractedFacts.thirdPartyName ? escapeHtml(extractedFacts.thirdPartyName) : 'someone else'}. You will need to include their written consent with your complaint. This should be a signed letter or email from them saying they give you permission to complain on their behalf.</span>
        </div>
      </div>
    `;
  }

  // Truthfulness notice
  sections += `
    <div class="next-steps-panel__section">
      <div class="next-steps-panel__label">Important Notice</div>
      <div class="next-steps-panel__text" style="font-size:0.8rem; color:var(--nhs-grey);">
        Before sending, please review your complaint text carefully and ensure all facts are accurate and truthful to the best of your knowledge. Making false or misleading statements in a formal complaint can have legal consequences. If you are unsure about any details, say so rather than guessing.
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="next-steps-panel">
      <div class="next-steps-panel__title">Next Steps</div>
      ${sections}
    </div>
  `;

  // Wire up download buttons in the panel
  const nsPdfBtn = container.querySelector('#ns-download-pdf');
  const nsDocxBtn = container.querySelector('#ns-download-docx');
  if (nsPdfBtn) nsPdfBtn.addEventListener('click', () => handleDownloadLetter('pdf'));
  if (nsDocxBtn) nsDocxBtn.addEventListener('click', () => handleDownloadLetter('docx'));

  // Wire up email button
  const emailBtn = container.querySelector('#send-email-btn');
  if (emailBtn && contactEmail) {
    emailBtn.addEventListener('click', () => handleSendEmail(contactEmail));
  }
}

async function handleSendEmail(toEmail) {
  const letterText = $('#letter-textarea').value;
  if (!letterText) {
    showToast('No complaint text to send.');
    return;
  }

  const statusEl = $('#email-status');
  const btn = $('#send-email-btn');
  if (btn) btn.disabled = true;

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toEmail,
        subject: `Complaint — ${extractedFacts?.publicBody || 'Public Body'}`,
        letterText
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      if (statusEl) {
        statusEl.innerHTML = `<div class="next-steps-panel__email-status next-steps-panel__email-status--success">Email sent successfully to ${escapeHtml(toEmail)}.</div>`;
      }
      showToast('Email sent successfully');
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<div class="next-steps-panel__email-status next-steps-panel__email-status--error">${escapeHtml(data.error || 'Failed to send email.')}</div>`;
      }
      showToast('Email could not be sent');
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<div class="next-steps-panel__email-status next-steps-panel__email-status--error">Network error — please download the complaint and send it manually.</div>`;
    }
    showToast('Email send failed');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Letter Actions ──

function handleBackToChat() {
  showChat();
}

function handleCopyLetter() {
  const text = $('#letter-textarea').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard');
  }).catch(() => {
    // Fallback
    $('#letter-textarea').select();
    document.execCommand('copy');
    showToast('Copied to clipboard');
  });
}

async function handleDownloadLetter(format) {
  const letterText = $('#letter-textarea').value;
  if (!letterText) {
    showToast('No complaint text to download.');
    return;
  }

  const endpoint = format === 'pdf' ? '/api/generate-pdf' : '/api/generate-docx';
  const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const ext = format === 'pdf' ? 'pdf' : 'docx';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterText })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast(data.error || `Failed to generate ${format.toUpperCase()}.`);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaint-letter-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${format.toUpperCase()} downloaded`);
  } catch (err) {
    showToast(`Failed to download ${format.toUpperCase()}.`);
  }
}

function handleBackToLanding() {
  showLanding();
}

// ── Toast ──

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

// ── Utility ──

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
