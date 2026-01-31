// Chat UI components & application controller
// Manages the full flow: landing → chat → summary → pathway → letter → diary
// Features: postcode lookup, devolved nations, vulnerability, deadlines, MP referral, diary, print, save/resume

import { sendMessage, generateOnce } from './gemini.js';
import { INTAKE_SYSTEM_PROMPT, extractFacts, getDisplayText } from './intake.js';
import { getPathway, adjustForStepsTaken } from './router.js';

// ── State ──

let conversationHistory = []; // {role: 'user'|'model', text: string}
let extractedFacts = null;
let currentPathway = null;
let resolvedBodies = null; // { council, icb, policeForce, country }
let resolvedMP = null; // { name, party, constituency, thumbnailUrl }
let sessionId = null; // For save/resume
let sessionStatus = 'intake'; // intake|summary|pathway|letter
let isSending = false;
let autoReadEnabled = false;
let currentUtterance = null;
let recognition = null;
let isRecording = false;

// ── DOM References ──

const $ = (sel) => document.querySelector(sel);
const landing = $('#landing');
const chatContainer = $('#chat-container');
const letterContainer = $('#letter-container');
const diaryContainer = $('#diary-container');
const messagesEl = $('#chat-messages');
const inputEl = $('#chat-input');
const sendBtn = $('#chat-send');
const typingIndicator = $('#typing-indicator');
const toast = $('#toast');

// ── Feature Detection ──

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesisSupported = 'speechSynthesis' in window;

// ── UK Bank Holidays (2025-2026) ──

const UK_BANK_HOLIDAYS = [
  '2025-01-01','2025-04-18','2025-04-21','2025-05-05','2025-05-26',
  '2025-08-25','2025-12-25','2025-12-26',
  '2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25',
  '2026-08-31','2026-12-25','2026-12-28'
];

// ── Consent ──

const CONSENT_KEY = 'complaints_navigator_consent';

function hasConsent() {
  return localStorage.getItem(CONSENT_KEY) === 'granted';
}

function grantConsent() {
  localStorage.setItem(CONSENT_KEY, 'granted');
}

function revokeConsent() {
  localStorage.removeItem(CONSENT_KEY);
}

// ── Identifier Redaction ──

const REDACT_PATTERNS = [
  { regex: /\b\d{3}\s?\d{3}\s?\d{4}\b/g, token: '[NHS_NUMBER]' },           // NHS number: 3-3-4 digits
  { regex: /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, token: '[NI_NUMBER]' }, // NI number
];

function redactIdentifiers(text) {
  let redacted = text;
  for (const { regex, token } of REDACT_PATTERNS) {
    redacted = redacted.replace(regex, token);
  }
  return redacted;
}

function redactHistory(history) {
  return history.map(msg => ({
    role: msg.role,
    text: redactIdentifiers(msg.text)
  }));
}

// ── Initialisation ──

export function init() {
  // Consent gate
  initConsentGate();

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
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  // Letter events
  $('#letter-back').addEventListener('click', handleBackToChat);
  $('#letter-copy').addEventListener('click', handleCopyLetter);
  $('#letter-download-pdf').addEventListener('click', () => handleDownloadLetter('pdf'));
  $('#letter-download-docx').addEventListener('click', () => handleDownloadLetter('docx'));
  $('#letter-print').addEventListener('click', () => window.print());

  // Letter review gate — disable actions until user confirms review
  const reviewCheck = $('#letter-review-check');
  if (reviewCheck) {
    reviewCheck.addEventListener('change', () => {
      const enabled = reviewCheck.checked;
      $('#letter-copy').disabled = !enabled;
      $('#letter-download-pdf').disabled = !enabled;
      $('#letter-download-docx').disabled = !enabled;
      $('#letter-print').disabled = !enabled;
    });
  }

  // Diary events
  $('#diary-back').addEventListener('click', handleDiaryBack);
  $('#diary-add').addEventListener('click', showDiaryForm);

  // Data management links
  const deleteAllBtn = $('#delete-all-data');
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', handleDeleteAllData);
  const privacyLink = $('#landing-privacy-link');
  if (privacyLink) privacyLink.addEventListener('click', () => showPrivacyModal());

  // Voice input (mic button)
  initVoiceInput();

  // Auto-read toggle
  initAutoReadToggle();

  // Purge expired sessions, then render
  purgeExpiredSessions();
  renderSavedSessions();
  renderDataLinks();
}

function initConsentGate() {
  const gate = $('#consent-gate');
  if (!gate) return;

  // Gate starts hidden — it is shown each time the user clicks "Start your complaint"
  gate.classList.add('hidden');

  // Wire up privacy link
  const privacyLink = $('#consent-privacy-link');
  if (privacyLink) {
    privacyLink.addEventListener('click', () => showPrivacyModal());
  }
}

function showPrivacyModal() {
  const modal = $('#privacy-modal');
  if (modal) {
    modal.classList.add('active');
    const closeBtn = $('#privacy-modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove('active');
    }
  }
}

// ── Delete All Data ──

function handleDeleteAllData() {
  if (!confirm('This will permanently delete all saved complaints, diary entries, and consent from this browser. This cannot be undone. Continue?')) return;

  // Remove all app keys from localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === STORAGE_KEY || key === CONSENT_KEY || key.startsWith('complaint_diary_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Reset in-memory state
  conversationHistory = [];
  extractedFacts = null;
  currentPathway = null;
  resolvedBodies = null;
  resolvedMP = null;
  sessionId = null;
  sessionStatus = 'intake';

  // Re-show consent gate
  const gate = $('#consent-gate');
  if (gate) gate.classList.remove('hidden');

  // Re-render landing
  renderSavedSessions();
  renderDataLinks();
  showLanding();
  showToast('All data deleted');
}

// ── Auto-Expiry (30 days) ──

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function purgeExpiredSessions() {
  const sessions = listSessions();
  const now = Date.now();
  const valid = sessions.filter(s => {
    const updated = new Date(s.updatedAt).getTime();
    return (now - updated) < SESSION_MAX_AGE_MS;
  });
  if (valid.length !== sessions.length) {
    // Also remove diary entries for purged sessions
    const validIds = new Set(valid.map(s => s.id));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('complaint_diary_')) {
        const diarySessionId = key.replace('complaint_diary_', '');
        if (!validIds.has(diarySessionId)) {
          localStorage.removeItem(key);
        }
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
  }
}

// ── Show data links if any data exists ──

function renderDataLinks() {
  const el = $('#landing-data-links');
  if (!el) return;
  const hasData = hasConsent() || listSessions().length > 0;
  el.classList.toggle('hidden', !hasData);
}

// ── Voice Input (Speech-to-Text) ──

function initVoiceInput() {
  const micBtn = $('#chat-mic');
  if (!SpeechRecognition || !micBtn) {
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

  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-GB';
  utterance.rate = 0.95;

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
  if (diaryContainer) diaryContainer.classList.remove('active');
  renderSavedSessions();
}

function showChat() {
  landing.classList.add('hidden');
  chatContainer.classList.add('active');
  letterContainer.classList.remove('active');
  if (diaryContainer) diaryContainer.classList.remove('active');
  inputEl.focus();
}

function showLetter() {
  landing.classList.add('hidden');
  chatContainer.classList.remove('active');
  letterContainer.classList.add('active');
  if (diaryContainer) diaryContainer.classList.remove('active');

  // Reset review gate — user must re-confirm on each visit
  const reviewCheck = $('#letter-review-check');
  if (reviewCheck) {
    reviewCheck.checked = false;
    $('#letter-copy').disabled = true;
    $('#letter-download-pdf').disabled = true;
    $('#letter-download-docx').disabled = true;
    $('#letter-print').disabled = true;
  }
}

function showDiary() {
  landing.classList.add('hidden');
  chatContainer.classList.remove('active');
  letterContainer.classList.remove('active');
  if (diaryContainer) diaryContainer.classList.add('active');
  renderDiaryEntries();
}

// ── Chat Flow ──

function handleStart() {
  // Show consent gate every time a new complaint is started
  showConsentGateForNewComplaint();
}

function showConsentGateForNewComplaint() {
  const gate = $('#consent-gate');
  if (!gate) { proceedToChat(); return; }

  // Reset checkboxes and button
  const check1 = $('#consent-check-1');
  const check2 = $('#consent-check-2');
  const check3 = $('#consent-check-3');
  const acceptBtn = $('#consent-accept');
  if (check1) check1.checked = false;
  if (check2) check2.checked = false;
  if (check3) check3.checked = false;
  if (acceptBtn) acceptBtn.disabled = true;

  gate.classList.remove('hidden');

  // Replace the accept button listener for this instance
  const newAcceptBtn = acceptBtn.cloneNode(true);
  acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
  newAcceptBtn.disabled = true;

  function updateState() {
    newAcceptBtn.disabled = !(check1.checked && check2.checked && check3.checked);
  }
  check1.addEventListener('change', updateState);
  check2.addEventListener('change', updateState);
  check3.addEventListener('change', updateState);

  newAcceptBtn.addEventListener('click', () => {
    grantConsent();
    gate.classList.add('hidden');
    proceedToChat();
  });
}

function proceedToChat() {
  // Reset state
  conversationHistory = [];
  extractedFacts = null;
  currentPathway = null;
  resolvedBodies = null;
  resolvedMP = null;
  sessionId = crypto.randomUUID();
  sessionStatus = 'intake';
  messagesEl.innerHTML = '';
  messagesEl.appendChild(typingIndicator);

  showChat();
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
    conversationHistory.push({ role: 'user', text: 'Hello, I need help making a complaint.' });
    conversationHistory.push({ role: 'model', text: response });
    addMessage('ai', getDisplayText(response));
    saveSession();
  } catch (err) {
    addMessage('error', err.message);
    showFallbackPathways();
  } finally {
    setTyping(false);
  }
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text || isSending) return;

  addMessage('user', text);
  inputEl.value = '';
  inputEl.style.height = 'auto';

  isSending = true;
  sendBtn.disabled = true;
  setTyping(true);

  try {
    // Redact identifiers before sending to Gemini API
    const redactedHistory = redactHistory(conversationHistory);
    const redactedText = redactIdentifiers(text);

    const response = await sendMessage(
      INTAKE_SYSTEM_PROMPT,
      redactedHistory,
      redactedText
    );

    // Store original (unredacted) text in local history for display/resume
    conversationHistory.push({ role: 'user', text });
    conversationHistory.push({ role: 'model', text: response });

    const facts = extractFacts(response);
    const displayText = getDisplayText(response);

    addMessage('ai', displayText);

    if (facts) {
      extractedFacts = facts;
      sessionStatus = 'summary';

      // Postcode lookup
      if (facts.postcode) {
        await lookupPostcode(facts.postcode);
      }

      showSummaryCard(facts);
    }

    saveSession();
  } catch (err) {
    addMessage('error', err.message);
    // If no facts extracted yet, show fallback pathways so user can still find help
    if (!extractedFacts) {
      showFallbackPathways();
    }
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    setTyping(false);
    inputEl.focus();
  }
}

// ── Postcode Lookup ──

async function lookupPostcode(postcode) {
  try {
    const response = await fetch(`/api/postcode/${encodeURIComponent(postcode.trim())}`);
    if (response.ok) {
      resolvedBodies = await response.json();
    }
  } catch {
    // Silently fail — postcode lookup is a nice-to-have
  }
}

// ── MP Lookup ──

async function lookupMP(postcode) {
  try {
    const response = await fetch(`/api/mp/${encodeURIComponent(postcode.trim())}`);
    if (response.ok) {
      resolvedMP = await response.json();
    }
  } catch {
    // Silently fail
  }
}

// ── Fallback Pathways (when Gemini is unavailable) ──

function showFallbackPathways() {
  // Prevent showing multiple fallback cards
  if (messagesEl.querySelector('.fallback-pathways')) return;

  const card = document.createElement('div');
  card.className = 'fallback-pathways';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Manual complaint pathway finder');

  const bodies = [
    { type: 'nhs_trust', label: 'NHS (hospital or trust)', desc: 'Complain to the trust, then PHSO' },
    { type: 'gp', label: 'GP surgery', desc: 'Complain to the practice, then PHSO' },
    { type: 'council', label: 'Council', desc: 'Complain to the council, then LGSCO' },
    { type: 'police', label: 'Police', desc: 'Complain to the force, then IOPC' },
    { type: 'dwp', label: 'DWP (benefits)', desc: 'Mandatory reconsideration, then tribunal' },
    { type: 'hmrc', label: 'HMRC (tax)', desc: 'Complain to HMRC, then Adjudicator\'s Office' },
    { type: 'school', label: 'School', desc: 'Complain to the school, then Ofsted or ESFA' },
    { type: 'social_care', label: 'Social care / care home', desc: 'Complain to provider, then LGSCO' }
  ];

  card.innerHTML = `
    <div class="fallback-pathways__title">The AI service is temporarily unavailable</div>
    <p class="fallback-pathways__intro">You can still find the right complaints pathway manually. Select the type of public body you want to complain about:</p>
    <div class="fallback-pathways__list">
      ${bodies.map(b => `
        <button class="fallback-pathways__item" data-type="${b.type}">
          <span class="fallback-pathways__item-label">${b.label}</span>
          <span class="fallback-pathways__item-desc">${b.desc}</span>
        </button>
      `).join('')}
    </div>
    <p class="fallback-pathways__footer">
      You can also call <strong>Citizens Advice</strong> on <strong>0800 144 8848</strong> (free) for help with any complaint, or try again later when the service is restored.
    </p>
  `;

  messagesEl.insertBefore(card, typingIndicator);
  scrollToBottom();

  // Wire up buttons to show the static pathway
  card.querySelectorAll('.fallback-pathways__item').forEach(btn => {
    btn.addEventListener('click', () => {
      const bodyType = btn.dataset.type;
      const pathway = getPathway(bodyType, 'general', 'England');
      if (pathway) {
        // Minimal extractedFacts for the pathway card display
        extractedFacts = { bodyType, publicBody: btn.querySelector('.fallback-pathways__item-label').textContent, withinTimeLimit: 'unknown' };
        currentPathway = pathway;
        sessionStatus = 'pathway';
        showPathwayCard(pathway);
      }
    });
  });
}

// ── Message Rendering ──

function addMessage(type, text) {
  const div = document.createElement('div');
  div.className = `message message--${type}`;
  div.setAttribute('role', type === 'error' ? 'alert' : 'log');

  div.innerHTML = renderMarkdown(text);

  if (type === 'ai') {
    const speakBtn = createSpeakButton(text);
    if (speakBtn) div.appendChild(speakBtn);

    if (autoReadEnabled) {
      setTimeout(() => speakText(text), 200);
    }
  }

  messagesEl.insertBefore(div, typingIndicator);
  scrollToBottom();
}

function renderMarkdown(text) {
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

let typingTimer = null;

function setTyping(active) {
  typingIndicator.classList.toggle('active', active);

  // Clear any existing progress timer
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }

  const label = $('#typing-label');
  if (!label) return;

  if (active) {
    const messages = [
      { at: 0,  text: 'Thinking...' },
      { at: 5,  text: 'Still thinking...' },
      { at: 12, text: 'This is taking a moment...' },
      { at: 20, text: 'Nearly there...' },
      { at: 35, text: 'Still working — please wait...' }
    ];
    let elapsed = 0;
    label.textContent = messages[0].text;

    typingTimer = setInterval(() => {
      elapsed++;
      const msg = [...messages].reverse().find(m => elapsed >= m.at);
      if (msg) label.textContent = msg.text;
    }, 1000);

    scrollToBottom();
  } else {
    label.textContent = 'Thinking...';
  }
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

  if (facts.thirdParty) {
    warnings += `<div class="summary-card__warning summary-card__warning--consent">
      <span class="summary-card__warning-icon">&#9993;</span>
      <span>You are complaining on behalf of ${facts.thirdPartyName ? escapeHtml(facts.thirdPartyName) : 'someone else'}. You will need their written consent to proceed.</span>
    </div>`;
  }

  // Safeguarding / emergency banner
  if (facts.safeguardingConcern && facts.safeguardingConcern !== 'none') {
    const safeguardingBanners = {
      emergency: {
        icon: '&#9888;',
        cls: 'summary-card__warning--emergency',
        text: '<strong>If anyone is in immediate danger, call 999 now.</strong> This tool cannot contact emergency services on your behalf. Once everyone is safe, we can help you make a formal complaint about the service.'
      },
      crime: {
        icon: '&#9888;',
        cls: 'summary-card__warning--safeguarding',
        text: '<strong>What you have described may involve a criminal offence.</strong> You can report this to the police on 101 (non-emergency). A complaint and a crime report are separate processes — you can pursue both. This tool can help with the complaint, but cannot report crimes on your behalf.'
      },
      child_safeguarding: {
        icon: '&#9888;',
        cls: 'summary-card__warning--safeguarding',
        text: '<strong>This may be a child safeguarding concern.</strong> Please contact your local council\'s children\'s safeguarding team or the NSPCC helpline on 0808 800 5000. This tool cannot make safeguarding referrals — only you or a professional can do that. We can still help you complain about the service separately.'
      },
      adult_safeguarding: {
        icon: '&#9888;',
        cls: 'summary-card__warning--safeguarding',
        text: '<strong>This may be an adult safeguarding concern.</strong> Please contact your local council\'s adult safeguarding team directly. This tool cannot make safeguarding referrals on your behalf. We can still help you complain about the service separately.'
      },
      regulatory: {
        icon: '&#9888;',
        cls: 'summary-card__warning--safeguarding',
        text: '<strong>This may warrant a report to a regulatory body.</strong> Consider contacting: CQC (0300 061 6161) for care services, GMC (0161 923 6602) for doctors, or NMC (020 7637 7181) for nurses. This tool cannot make regulatory reports — we can help with the formal complaint.'
      }
    };
    const banner = safeguardingBanners[facts.safeguardingConcern];
    if (banner) {
      warnings += `<div class="summary-card__warning ${banner.cls}">
        <span class="summary-card__warning-icon">${banner.icon}</span>
        <span>${banner.text}</span>
      </div>`;
    }
  }

  // Vulnerability / Reasonable Adjustments banner
  if (facts.vulnerabilityFlags || facts.reasonableAdjustments) {
    warnings += `<div class="summary-card__warning summary-card__warning--accessibility">
      <span class="summary-card__warning-icon">&#9829;</span>
      <span>Accessibility needs noted: ${escapeHtml(facts.reasonableAdjustments || facts.vulnerabilityFlags)}. Public bodies have a legal duty to make reasonable adjustments under the Equality Act 2010.</span>
    </div>`;
  }

  // Resolved bodies from postcode
  let resolvedHtml = '';
  if (resolvedBodies) {
    const items = [];
    if (resolvedBodies.council) items.push(`<strong>Local council:</strong> ${escapeHtml(resolvedBodies.council)}`);
    if (resolvedBodies.icb) items.push(`<strong>NHS ICB:</strong> ${escapeHtml(resolvedBodies.icb)}`);
    if (resolvedBodies.policeForce) items.push(`<strong>Police force:</strong> ${escapeHtml(resolvedBodies.policeForce)}`);
    if (resolvedBodies.country && resolvedBodies.country !== 'England') items.push(`<strong>Nation:</strong> ${escapeHtml(resolvedBodies.country)}`);
    if (items.length > 0) {
      resolvedHtml = `<div class="summary-card__postcode-info">${items.join('<br>')}</div>`;
    }
  }

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
    ${resolvedHtml}
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

  card.querySelector('#confirm-summary').addEventListener('click', () => {
    // Gate with safeguarding acknowledgment if a concern was flagged
    if (facts.safeguardingConcern && facts.safeguardingConcern !== 'none') {
      showSafeguardingGate(facts.safeguardingConcern);
    } else {
      handleConfirmSummary();
    }
  });
  card.querySelector('#edit-summary').addEventListener('click', () => {
    addMessage('system', 'No problem — just type what you\'d like to add or change, and I\'ll update the summary.');
    inputEl.focus();
  });
}

// ── Safeguarding Acknowledgment Gate ──

// Serious concerns: tool will NOT process the complaint — signpost only
const SERIOUS_CONCERNS = ['emergency', 'crime', 'child_safeguarding', 'adult_safeguarding'];

function showSafeguardingGate(concernType) {
  const gate = document.createElement('div');
  gate.className = 'safeguarding-gate';
  gate.setAttribute('role', 'alertdialog');
  gate.setAttribute('aria-label', 'Important safeguarding notice');

  const isSerious = SERIOUS_CONCERNS.includes(concernType);
  const nation = resolvedBodies?.country || extractedFacts?.nation || 'England';

  // Nation-specific regulatory contacts
  const regulatoryContacts = {
    England: [
      { label: 'CQC (care services)', value: '0300 061 6161' },
      { label: 'GMC (doctors)', value: '0161 923 6602' },
      { label: 'NMC (nurses/midwives)', value: '020 7637 7181' }
    ],
    Scotland: [
      { label: 'Care Inspectorate (care services)', value: '0345 600 9527' },
      { label: 'GMC (doctors)', value: '0161 923 6602' },
      { label: 'NMC (nurses/midwives)', value: '020 7637 7181' }
    ],
    Wales: [
      { label: 'Care Inspectorate Wales (CIW)', value: '0300 7900 126' },
      { label: 'GMC (doctors)', value: '0161 923 6602' },
      { label: 'NMC (nurses/midwives)', value: '020 7637 7181' }
    ],
    'Northern Ireland': [
      { label: 'RQIA (care services)', value: '028 9536 1111' },
      { label: 'GMC (doctors)', value: '0161 923 6602' },
      { label: 'NMC (nurses/midwives)', value: '020 7637 7181' }
    ]
  };

  // Nation-specific child safeguarding contacts
  const childSafeguardingContacts = {
    England: [
      { label: 'NSPCC helpline', value: '0808 800 5000' },
      { label: 'Local council children\'s safeguarding', value: 'Find via your council\'s website' },
      { label: 'Police (if a crime)', value: '101 or 999 if urgent' }
    ],
    Scotland: [
      { label: 'NSPCC helpline', value: '0808 800 5000' },
      { label: 'Scottish Children\'s Reporter', value: '0300 200 1555' },
      { label: 'Local council children\'s services', value: 'Find via your council\'s website' },
      { label: 'Police Scotland', value: '101 or 999 if urgent' }
    ],
    Wales: [
      { label: 'NSPCC helpline', value: '0808 800 5000' },
      { label: 'Local council children\'s services', value: 'Find via your council\'s website' },
      { label: 'Police (if a crime)', value: '101 or 999 if urgent' }
    ],
    'Northern Ireland': [
      { label: 'NSPCC helpline', value: '0808 800 5000' },
      { label: 'Health and Social Care Trust gateway team', value: 'Find via your local Trust' },
      { label: 'PSNI (police)', value: '101 or 999 if urgent' }
    ]
  };

  // Nation-specific adult safeguarding contacts
  const adultSafeguardingContacts = {
    England: [
      { label: 'Local council adult safeguarding', value: 'Find via your council\'s website' },
      { label: 'Police (if a crime)', value: '101 or 999 if urgent' }
    ],
    Scotland: [
      { label: 'Local council adult protection team', value: 'Find via your council\'s website' },
      { label: 'Police Scotland', value: '101 or 999 if urgent' }
    ],
    Wales: [
      { label: 'Local council adult safeguarding', value: 'Find via your council\'s website' },
      { label: 'Police (if a crime)', value: '101 or 999 if urgent' }
    ],
    'Northern Ireland': [
      { label: 'Health and Social Care Trust adult safeguarding', value: 'Find via your local Trust' },
      { label: 'PSNI (police)', value: '101 or 999 if urgent' }
    ]
  };

  // Nation-specific police contacts for crime reporting
  const policeLabel = nation === 'Northern Ireland' ? 'PSNI non-emergency' : nation === 'Scotland' ? 'Police Scotland non-emergency' : 'Police non-emergency';

  const contactInfo = {
    emergency: {
      title: 'This situation may require emergency services',
      action: 'If anyone is in immediate danger, call <strong>999</strong> now.',
      contacts: [
        { label: 'Emergency services', value: '999' },
        { label: policeLabel, value: '101' }
      ]
    },
    crime: {
      title: 'What you described may involve a criminal offence',
      action: 'To report a crime, contact the police directly.',
      contacts: [
        { label: policeLabel, value: '101' },
        { label: 'Action Fraud (fraud/cyber crime)', value: '0300 123 2040' }
      ]
    },
    child_safeguarding: {
      title: 'This may be a child safeguarding concern',
      action: 'To protect a child from harm, contact a safeguarding team directly.',
      contacts: childSafeguardingContacts[nation] || childSafeguardingContacts.England
    },
    adult_safeguarding: {
      title: 'This may be an adult safeguarding concern',
      action: 'To protect a vulnerable adult from harm, contact safeguarding directly.',
      contacts: adultSafeguardingContacts[nation] || adultSafeguardingContacts.England
    },
    regulatory: {
      title: 'This may need reporting to a regulatory body',
      action: 'Regulators can investigate unsafe practice and take enforcement action.',
      contacts: regulatoryContacts[nation] || regulatoryContacts.England
    }
  };

  const info = contactInfo[concernType] || contactInfo.crime;
  const contactsHtml = info.contacts.map(c =>
    `<div class="safeguarding-gate__contact"><strong>${escapeHtml(c.label)}:</strong> ${c.value}</div>`
  ).join('');

  const explainerText = isSerious
    ? `This tool helps with formal complaints about public services. It is <strong>not able to handle crime reports or safeguarding referrals</strong> — those must go through the services listed above. Please contact them directly.`
    : `A formal complaint addresses organisational and service failures — it is <strong>not</strong> a crime report or safeguarding referral. These are separate processes. You are entitled to pursue both, but you need to contact the services above yourself. This tool cannot make reports or referrals on your behalf.`;

  const actionsHtml = isSerious
    ? `<button class="btn btn--primary" id="gate-go-home">Return to home</button>`
    : `<button class="btn btn--primary" id="gate-acknowledge">I understand — continue with my complaint</button>
       <button class="btn btn--outline" id="gate-pause">I need to make a report first</button>`;

  gate.innerHTML = `
    <div class="safeguarding-gate__icon">&#9888;</div>
    <div class="safeguarding-gate__title">${info.title}</div>
    <div class="safeguarding-gate__body">
      <p>${info.action}</p>
      <div class="safeguarding-gate__contacts">${contactsHtml}</div>
      <p class="safeguarding-gate__explainer">${explainerText}</p>
    </div>
    <div class="safeguarding-gate__actions">${actionsHtml}</div>
  `;

  messagesEl.insertBefore(gate, typingIndicator);
  scrollToBottom();

  if (isSerious) {
    // Serious concern — do not process the complaint, send user home
    gate.querySelector('#gate-go-home').addEventListener('click', () => {
      handleBackToLanding();
    });
  } else {
    // Regulatory — allow proceeding after acknowledgment
    gate.querySelector('#gate-acknowledge').addEventListener('click', () => {
      gate.querySelector('#gate-acknowledge').disabled = true;
      gate.querySelector('#gate-pause').disabled = true;
      gate.querySelector('#gate-acknowledge').textContent = 'Acknowledged';
      handleConfirmSummary();
    });

    gate.querySelector('#gate-pause').addEventListener('click', () => {
      gate.querySelector('#gate-acknowledge').disabled = true;
      gate.querySelector('#gate-pause').disabled = true;
      gate.querySelector('#gate-pause').textContent = 'Paused';
      addMessage('system', 'No problem. Take the time you need to make any reports. Your complaint summary is saved — you can come back to it by reopening this session from the home screen.');
      saveSession();
    });
  }
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

  // Determine nation from postcode lookup, or from AI-extracted nation field, or default to England
  const nation = resolvedBodies?.country || extractedFacts.nation || 'England';

  // Get pathway — pass complaintType for DWP routing, nation for devolved nations
  const pathway = getPathway(extractedFacts.bodyType, extractedFacts.complaintType, nation);
  currentPathway = adjustForStepsTaken(pathway, extractedFacts.stepsTaken);
  sessionStatus = 'pathway';

  showPathwayCard(currentPathway);
  saveSession();
}

// ── Deadline Calculator ──

function parseEventDate(facts) {
  // Try to parse dateSpecific first, then dateRange
  const dateStr = facts.dateSpecific || facts.dateRange;
  if (!dateStr) return null;

  // Try direct parse
  let d = new Date(dateStr);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;

  // Try common UK date formats
  const ukMatch = dateStr.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/);
  if (ukMatch) {
    const year = ukMatch[3].length === 2 ? 2000 + parseInt(ukMatch[3]) : parseInt(ukMatch[3]);
    d = new Date(year, parseInt(ukMatch[2]) - 1, parseInt(ukMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try month name patterns like "March 2024", "15 March 2024"
  const monthMatch = dateStr.match(/(\d{1,2})?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/i);
  if (monthMatch) {
    const months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };
    const month = months[monthMatch[2].toLowerCase()];
    const day = monthMatch[1] ? parseInt(monthMatch[1]) : 1;
    d = new Date(parseInt(monthMatch[3]), month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function addWorkingDays(fromDate, days) {
  const result = new Date(fromDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    const dateStr = result.toISOString().slice(0, 10);
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !UK_BANK_HOLIDAYS.includes(dateStr)) {
      added++;
    }
  }
  return result;
}

function addMonths(fromDate, months) {
  const result = new Date(fromDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calculateDeadlines(facts, pathway) {
  const eventDate = parseEventDate(facts);
  if (!eventDate) return null;

  const today = new Date();
  const deadlines = {};

  // Submission deadline based on timeLimit text
  const tl = pathway.timeLimit.toLowerCase();
  if (tl.includes('1 month')) {
    deadlines.submitBy = addMonths(eventDate, 1);
  } else if (tl.includes('6 month')) {
    deadlines.submitBy = addMonths(eventDate, 6);
  } else if (tl.includes('12 month')) {
    deadlines.submitBy = addMonths(eventDate, 12);
  }

  if (deadlines.submitBy) {
    const daysRemaining = Math.ceil((deadlines.submitBy - today) / (1000 * 60 * 60 * 24));
    deadlines.submitUrgent = daysRemaining <= 30;
    deadlines.submitExpired = daysRemaining < 0;
    deadlines.daysRemaining = daysRemaining;
  }

  // Expected acknowledgment and response from current step
  const currentStep = pathway.steps.find(s => s.current) || pathway.steps[0];
  if (currentStep.acknowledgmentTimeline) {
    const ackMatch = currentStep.acknowledgmentTimeline.match(/(\d+)\s*working\s*day/i);
    if (ackMatch) {
      deadlines.acknowledgmentBy = addWorkingDays(today, parseInt(ackMatch[1]));
    }
  }
  if (currentStep.timeline) {
    const respMatch = currentStep.timeline.match(/(\d+)\s*working\s*day/i);
    if (respMatch) {
      deadlines.responseBy = addWorkingDays(today, parseInt(respMatch[1]));
    } else {
      const monthMatch = currentStep.timeline.match(/(\d+)\s*month/i);
      if (monthMatch) {
        deadlines.responseBy = addMonths(today, parseInt(monthMatch[1]));
      }
    }
  }

  return deadlines;
}

// ── Pathway Card ──

function showPathwayCard(pathway) {
  const card = document.createElement('div');
  card.className = 'pathway-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Recommended complaint pathway');

  // Nation banner for devolved nations
  const nation = resolvedBodies?.country || extractedFacts?.nation;
  let nationBanner = '';
  if (nation && nation !== 'England') {
    nationBanner = `<div class="pathway-nation-banner">This pathway is specific to ${escapeHtml(nation)}</div>`;
  }

  // Time limit banner
  let timeLimitBanner = '';
  if (pathway.timeLimit) {
    let bannerClass = 'pathway-time-limit';
    let icon = '&#128339;';
    if (extractedFacts && extractedFacts.withinTimeLimit === 'at_risk') {
      bannerClass += ' pathway-time-limit--at-risk';
      icon = '&#9888;';
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

  // Deadline calculator
  let deadlinesHtml = '';
  if (extractedFacts) {
    const deadlines = calculateDeadlines(extractedFacts, pathway);
    if (deadlines) {
      let rows = '';
      if (deadlines.submitBy) {
        const urgentClass = deadlines.submitExpired ? 'pathway-deadlines__date--expired' : deadlines.submitUrgent ? 'pathway-deadlines__date--urgent' : '';
        const label = deadlines.submitExpired ? 'Deadline passed' : `${deadlines.daysRemaining} days remaining`;
        rows += `<div class="pathway-deadlines__row ${urgentClass}"><span class="pathway-deadlines__label">Submit by:</span> <span class="pathway-deadlines__date">${formatDate(deadlines.submitBy)}</span> <span class="pathway-deadlines__remaining">(${label})</span></div>`;
      }
      if (deadlines.acknowledgmentBy) {
        rows += `<div class="pathway-deadlines__row"><span class="pathway-deadlines__label">Expect acknowledgment by:</span> <span class="pathway-deadlines__date">${formatDate(deadlines.acknowledgmentBy)}</span></div>`;
      }
      if (deadlines.responseBy) {
        rows += `<div class="pathway-deadlines__row"><span class="pathway-deadlines__label">Expect response by:</span> <span class="pathway-deadlines__date">${formatDate(deadlines.responseBy)}</span></div>`;
      }
      if (rows) {
        deadlinesHtml = `<div class="pathway-deadlines"><div class="pathway-deadlines__title">Key Dates</div>${rows}</div>`;
      }
    }
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

  // Build steps
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

    let portalLinkHtml = '';
    if (step.portalUrl) {
      portalLinkHtml = `<div class="pathway-step__portal"><a href="${escapeHtml(step.portalUrl)}" target="_blank" rel="noopener noreferrer">Find contact details &rarr;</a></div>`;
    }

    return `
      <li class="pathway-step ${step.current ? 'pathway-step--current' : ''}">
        <div class="pathway-step__name">${escapeHtml(step.name)}</div>
        <div class="pathway-step__desc">${escapeHtml(step.description)}</div>
        ${portalLinkHtml}
        <div class="pathway-step__timeline">${escapeHtml(step.timeline)}</div>
        ${step.acknowledgmentTimeline ? `<div class="pathway-step__ack">Expected acknowledgment: ${escapeHtml(step.acknowledgmentTimeline)}</div>` : ''}
        ${step.escalationTrigger ? `<div class="pathway-step__escalation">Next step: ${escapeHtml(step.escalationTrigger)}</div>` : ''}
        ${infoNeededHtml}
      </li>
    `;
  }).join('');

  // Evidence guidance
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
    ${nationBanner}
    ${timeLimitBanner}
    ${deadlinesHtml}
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
      <button class="btn btn--outline" id="open-diary-pathway">Complaint diary</button>
      <button class="btn btn--secondary" id="continue-chat">I have more questions</button>
    </div>
  `;

  messagesEl.insertBefore(card, typingIndicator);
  scrollToBottom();

  card.querySelector('#generate-letter').addEventListener('click', () => handleGenerateLetter());
  card.querySelector('#open-diary-pathway').addEventListener('click', () => showDiary());
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
    sessionStatus = 'letter';
    showLetter();
    $('#letter-textarea').value = letter;

    // Start MP lookup in background if postcode available
    if (extractedFacts.postcode && !resolvedMP) {
      lookupMP(extractedFacts.postcode);
    }

    renderNextStepsPanel();
    saveSession();
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

const MP_LETTER_SYSTEM_PROMPT = `You write a short referral letter from a constituent to their local MP asking the MP to take up a complaint on their behalf.

RULES:
- Keep it under 250 words.
- Plain, first-person language. No formal register.
- Address it to the MP by name.
- Briefly explain the complaint: which public body, what happened, and what the person wants.
- Ask the MP to raise the matter on their behalf.
- Include [YOUR NAME], [YOUR ADDRESS], [DATE] placeholders.
- Do NOT embellish or add details not provided.
- Output ONLY the letter text. No commentary.`;

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

  // Vulnerability / Reasonable Adjustments
  if (facts.vulnerabilityFlags || facts.reasonableAdjustments) {
    prompt += `\n\nNote: The complainant has indicated the following accessibility needs: ${facts.reasonableAdjustments || facts.vulnerabilityFlags}. Include a sentence requesting reasonable adjustments.`;
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

  // MP Referral section
  if (extractedFacts && extractedFacts.postcode) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="next-steps-panel__label">Write to Your MP</div>
        <div class="next-steps-panel__text">Your MP can raise your complaint directly with the public body. Some ombudsmen (including the PHSO) require an MP referral.</div>
        <div id="mp-info-panel"></div>
        <div class="next-steps-panel__actions">
          <button class="btn btn--outline" id="generate-mp-letter">Generate MP referral letter</button>
        </div>
        <div id="mp-letter-container" class="mp-letter-container"></div>
      </div>
    `;
  }

  // Vulnerability / Reasonable Adjustments reminder
  if (extractedFacts && (extractedFacts.vulnerabilityFlags || extractedFacts.reasonableAdjustments)) {
    sections += `
      <div class="next-steps-panel__section">
        <div class="adjustments-reminder">
          <span class="adjustments-reminder__icon">&#9829;</span>
          <span>Remember to mention your accessibility needs when you submit. Public bodies have a legal duty to make reasonable adjustments under the Equality Act 2010.</span>
        </div>
      </div>
    `;
  }

  // Evidence checklist
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

  // Diary link
  sections += `
    <div class="next-steps-panel__section">
      <div class="next-steps-panel__label">Track Your Progress</div>
      <div class="next-steps-panel__text">Use the complaint diary to log events as you go through the process.</div>
      <div class="next-steps-panel__actions">
        <button class="btn btn--outline" id="ns-open-diary">Open complaint diary</button>
      </div>
    </div>
  `;

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

  // Wire up download buttons
  const nsPdfBtn = container.querySelector('#ns-download-pdf');
  const nsDocxBtn = container.querySelector('#ns-download-docx');
  if (nsPdfBtn) nsPdfBtn.addEventListener('click', () => handleDownloadLetter('pdf'));
  if (nsDocxBtn) nsDocxBtn.addEventListener('click', () => handleDownloadLetter('docx'));

  // Wire up email button
  const emailBtn = container.querySelector('#send-email-btn');
  if (emailBtn && contactEmail) {
    emailBtn.addEventListener('click', () => handleSendEmail(contactEmail));
  }

  // Wire up MP letter button
  const mpBtn = container.querySelector('#generate-mp-letter');
  if (mpBtn) {
    mpBtn.addEventListener('click', () => handleGenerateMPLetter());
  }

  // Wire up diary button
  const diaryBtn = container.querySelector('#ns-open-diary');
  if (diaryBtn) {
    diaryBtn.addEventListener('click', () => showDiary());
  }

  // Load MP info if available
  if (extractedFacts && extractedFacts.postcode) {
    renderMPInfo();
  }
}

// ── MP Referral ──

async function renderMPInfo() {
  const panel = $('#mp-info-panel');
  if (!panel) return;

  if (!resolvedMP && extractedFacts?.postcode) {
    await lookupMP(extractedFacts.postcode);
  }

  if (resolvedMP) {
    panel.innerHTML = `
      <div class="mp-info">
        ${resolvedMP.thumbnailUrl ? `<img src="${escapeHtml(resolvedMP.thumbnailUrl)}" alt="" class="mp-info__photo">` : ''}
        <div class="mp-info__details">
          <div class="mp-info__name">${escapeHtml(resolvedMP.name)}</div>
          <div class="mp-info__constituency">${escapeHtml(resolvedMP.constituency || '')}</div>
          <div class="mp-info__party">${escapeHtml(resolvedMP.party || '')}</div>
        </div>
      </div>
    `;
  }
}

async function handleGenerateMPLetter() {
  if (!extractedFacts) return;

  const mpBtn = $('#generate-mp-letter');
  const mpContainer = $('#mp-letter-container');
  if (!mpContainer) return;

  if (mpBtn) mpBtn.disabled = true;
  mpContainer.innerHTML = '<div class="mp-letter-loading">Generating MP referral letter...</div>';

  const mpName = resolvedMP?.name || '[MP NAME]';
  const constituency = resolvedMP?.constituency || '[CONSTITUENCY]';

  const prompt = `Write a short referral letter to ${mpName}, MP for ${constituency}.

The constituent wants the MP to take up their complaint against: ${extractedFacts.publicBody}
Issue: ${extractedFacts.issue}
Details: ${extractedFacts.details}
Desired outcome: ${extractedFacts.desiredOutcome}

CRITICAL: Do NOT embellish. Keep it under 250 words. Plain language only.`;

  try {
    const letter = await generateOnce(MP_LETTER_SYSTEM_PROMPT, prompt);
    mpContainer.innerHTML = `
      <div class="mp-letter-content">
        <textarea class="mp-letter-textarea" id="mp-letter-textarea" rows="10">${escapeHtml(letter)}</textarea>
        <div class="mp-letter-actions">
          <button class="btn btn--primary btn--sm" id="mp-letter-copy">Copy MP letter</button>
        </div>
      </div>
    `;
    mpContainer.querySelector('#mp-letter-copy').addEventListener('click', () => {
      const text = $('#mp-letter-textarea').value;
      navigator.clipboard.writeText(text).then(() => showToast('MP letter copied')).catch(() => {
        $('#mp-letter-textarea').select();
        document.execCommand('copy');
        showToast('MP letter copied');
      });
    });
  } catch (err) {
    mpContainer.innerHTML = `<div class="mp-letter-error">Could not generate MP letter: ${escapeHtml(err.message)}</div>`;
  } finally {
    if (mpBtn) mpBtn.disabled = false;
  }
}

// ── Email ──

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

// ── Complaint Diary ──

function getDiaryKey() {
  return `complaint_diary_${sessionId || 'default'}`;
}

function getDiaryEntries() {
  try {
    return JSON.parse(localStorage.getItem(getDiaryKey())) || [];
  } catch {
    return [];
  }
}

function saveDiaryEntries(entries) {
  localStorage.setItem(getDiaryKey(), JSON.stringify(entries));
}

function addDiaryEntry(entry) {
  const entries = getDiaryEntries();
  entries.unshift({ ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  saveDiaryEntries(entries);
  renderDiaryEntries();
}

function deleteDiaryEntry(id) {
  const entries = getDiaryEntries().filter(e => e.id !== id);
  saveDiaryEntries(entries);
  renderDiaryEntries();
}

function renderDiaryEntries() {
  const entriesEl = $('#diary-entries');
  const emptyEl = $('#diary-empty');
  if (!entriesEl || !emptyEl) return;

  const entries = getDiaryEntries();

  if (entries.length === 0) {
    entriesEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  const typeLabels = { sent: 'Sent', received: 'Received', phone: 'Phone call', meeting: 'Meeting', other: 'Other' };

  entriesEl.innerHTML = entries.map(entry => `
    <div class="diary-entry" data-id="${entry.id}">
      <div class="diary-entry__header">
        <span class="diary-entry__type diary-entry__type--${entry.type || 'other'}">${typeLabels[entry.type] || 'Other'}</span>
        <span class="diary-entry__date">${entry.date ? new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
        <button class="diary-entry__delete" aria-label="Delete entry" title="Delete">&times;</button>
      </div>
      <div class="diary-entry__title">${escapeHtml(entry.title || '')}</div>
      ${entry.notes ? `<div class="diary-entry__notes">${escapeHtml(entry.notes)}</div>` : ''}
    </div>
  `).join('');

  // Wire up delete buttons
  entriesEl.querySelectorAll('.diary-entry__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.diary-entry').dataset.id;
      deleteDiaryEntry(id);
    });
  });
}

function showDiaryForm() {
  const entriesEl = $('#diary-entries');
  if (!entriesEl) return;

  // Check if form already shown
  if (entriesEl.querySelector('.diary-form')) return;

  const today = new Date().toISOString().slice(0, 10);

  const form = document.createElement('div');
  form.className = 'diary-form';
  form.innerHTML = `
    <div class="diary-form__field">
      <label class="diary-form__label" for="diary-date">Date</label>
      <input type="date" id="diary-date" class="diary-form__input" value="${today}">
    </div>
    <div class="diary-form__field">
      <label class="diary-form__label" for="diary-type">Type</label>
      <select id="diary-type" class="diary-form__input">
        <option value="sent">Sent complaint/letter</option>
        <option value="received">Received response</option>
        <option value="phone">Phone call</option>
        <option value="meeting">Meeting</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="diary-form__field">
      <label class="diary-form__label" for="diary-title">Title</label>
      <input type="text" id="diary-title" class="diary-form__input" placeholder="Brief description">
    </div>
    <div class="diary-form__field">
      <label class="diary-form__label" for="diary-notes">Notes (optional)</label>
      <textarea id="diary-notes" class="diary-form__input diary-form__textarea" rows="3" placeholder="Additional details"></textarea>
    </div>
    <div class="diary-form__actions">
      <button class="btn btn--primary btn--sm" id="diary-save">Save entry</button>
      <button class="btn btn--secondary btn--sm" id="diary-cancel">Cancel</button>
    </div>
  `;

  entriesEl.prepend(form);

  form.querySelector('#diary-save').addEventListener('click', () => {
    const title = form.querySelector('#diary-title').value.trim();
    if (!title) {
      showToast('Please enter a title.');
      return;
    }
    addDiaryEntry({
      date: form.querySelector('#diary-date').value,
      type: form.querySelector('#diary-type').value,
      title,
      notes: form.querySelector('#diary-notes').value.trim()
    });
    form.remove();
  });

  form.querySelector('#diary-cancel').addEventListener('click', () => form.remove());
}

function handleDiaryBack() {
  // Go back to letter view if we have a letter, otherwise chat, otherwise landing
  if (sessionStatus === 'letter') {
    showLetter();
  } else if (sessionStatus === 'pathway' || sessionStatus === 'summary' || sessionStatus === 'intake') {
    showChat();
  } else {
    showLanding();
  }
}

// ── Save & Resume ──

const STORAGE_KEY = 'complaints_navigator_sessions';

function listSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSession() {
  if (!sessionId) return;

  const sessions = listSessions();
  const existing = sessions.findIndex(s => s.id === sessionId);

  // Data minimisation: only store conversation history during intake.
  // Once facts are extracted, drop the full conversation to reduce stored personal data.
  const shouldStoreHistory = sessionStatus === 'intake';

  const sessionData = {
    id: sessionId,
    createdAt: existing >= 0 ? sessions[existing].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publicBody: extractedFacts?.publicBody || 'New complaint',
    bodyType: extractedFacts?.bodyType || null,
    status: sessionStatus,
    conversationHistory: shouldStoreHistory ? conversationHistory : [],
    extractedFacts,
    resolvedBodies,
    resolvedMP,
    currentPathway,
    letterText: sessionStatus === 'letter' ? ($('#letter-textarea')?.value || '') : ''
  };

  if (existing >= 0) {
    sessions[existing] = sessionData;
  } else {
    sessions.unshift(sessionData);
  }

  // Keep max 10 sessions
  if (sessions.length > 10) sessions.length = 10;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function deleteSession(id) {
  const sessions = listSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  // Also delete diary entries for this session
  localStorage.removeItem(`complaint_diary_${id}`);
  renderSavedSessions();
  renderDataLinks();
}

function renderSavedSessions() {
  const container = $('#saved-sessions');
  if (!container) return;

  const sessions = listSessions();
  if (sessions.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const statusLabels = { intake: 'In progress', summary: 'Summary ready', pathway: 'Pathway shown', letter: 'Letter drafted' };

  container.innerHTML = `
    <div class="saved-sessions__title">Resume a saved complaint</div>
    <div class="saved-sessions__list">
      ${sessions.map(s => `
        <div class="saved-session-card" data-id="${s.id}">
          <div class="saved-session-card__body">${escapeHtml(s.publicBody || 'New complaint')}</div>
          <div class="saved-session-card__meta">
            <span class="saved-session-card__status saved-session-card__status--${s.status}">${statusLabels[s.status] || s.status}</span>
            <span class="saved-session-card__date">${new Date(s.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div class="saved-session-card__actions">
            <button class="btn btn--primary btn--sm saved-session-card__resume">Resume</button>
            <button class="btn btn--secondary btn--sm saved-session-card__delete">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.saved-session-card__resume').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.saved-session-card').dataset.id;
      handleResume(id);
    });
  });

  container.querySelectorAll('.saved-session-card__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.saved-session-card').dataset.id;
      deleteSession(id);
    });
  });
}

function handleResume(id) {
  const sessions = listSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) return;

  // Restore state
  sessionId = session.id;
  conversationHistory = session.conversationHistory || [];
  extractedFacts = session.extractedFacts || null;
  currentPathway = session.currentPathway || null;
  resolvedBodies = session.resolvedBodies || null;
  resolvedMP = session.resolvedMP || null;
  sessionStatus = session.status || 'intake';

  // Re-render messages
  messagesEl.innerHTML = '';
  messagesEl.appendChild(typingIndicator);

  // Replay conversation history (skip first synthetic user message)
  let skipFirst = true;
  for (const msg of conversationHistory) {
    if (skipFirst && msg.role === 'user') {
      skipFirst = false;
      continue;
    }
    if (msg.role === 'user') {
      addMessage('user', msg.text);
    } else if (msg.role === 'model') {
      addMessage('ai', getDisplayText(msg.text));
    }
  }

  // Navigate to correct view
  if (sessionStatus === 'letter') {
    showLetter();
    if (session.letterText) {
      $('#letter-textarea').value = session.letterText;
    }
    renderNextStepsPanel();
  } else if (sessionStatus === 'pathway' && currentPathway) {
    showChat();
    showPathwayCard(currentPathway);
  } else if (sessionStatus === 'summary' && extractedFacts) {
    showChat();
    showSummaryCard(extractedFacts);
  } else {
    showChat();
  }
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
