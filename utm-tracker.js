const UTM_STORAGE_KEY = 'mypaul_utm';
const UTM_COOKIE_NAME = 'mypaul_utm';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function parseUtmParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const result = {};
  UTM_FIELDS.forEach((field) => {
    if (params.has(field)) {
      const value = params.get(field).trim();
      if (value) result[field] = value;
    }
  });
  return Object.keys(result).length ? result : null;
}

function hasUtmData(utm) {
  return utm && Object.values(utm).some((value) => value);
}

function getSessionUtm() {
  const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setSessionUtm(utm) {
  if (!hasUtmData(utm)) return;
  sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const entries = document.cookie.split('; ').map((item) => item.split('='));
  const match = entries.find(([key]) => key === name);
  return match ? decodeURIComponent(match[1] || '') : null;
}

function persistUtm(utm) {
  if (!hasUtmData(utm)) return null;
  setSessionUtm(utm);
  setCookie(UTM_COOKIE_NAME, JSON.stringify(utm), 30);
  return utm;
}

function restoreUtmFromCookie() {
  const raw = getCookie(UTM_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (hasUtmData(parsed)) {
      setSessionUtm(parsed);
      return parsed;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function getStoredUtm() {
  return getSessionUtm() || restoreUtmFromCookie();
}

function preserveFirstTouchUtm() {
  const currentUtm = parseUtmParams();
  const storedUtm = getSessionUtm() || restoreUtmFromCookie();

  if (storedUtm && hasUtmData(storedUtm)) {
    return storedUtm;
  }

  if (currentUtm && hasUtmData(currentUtm)) {
    return persistUtm(currentUtm);
  }

  return null;
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function pushDataLayer(payload) {
  const dl = ensureDataLayer();
  dl.push(payload);
  console.log('[UTM Tracker] dataLayer.push', payload);
}

function pushPageViewDataLayer() {
  const utm = getStoredUtm() || {};
  pushDataLayer({
    event: 'page_view_data',
    page_path: window.location.pathname,
    page_title: document.title,
    ...utm,
  });
}

function pushFormSubmitDataLayer(formType, formName) {
  const utm = getStoredUtm() || {};
  pushDataLayer({
    event: 'form_submit',
    form_type: formType,
    form_name: formName,
    ...utm,
  });
}

function pushGenerateLeadDataLayer(formType, formName) {
  const utm = getStoredUtm() || {};
  pushDataLayer({
    event: 'generate_lead',
    form_type: formType,
    form_name: formName,
    ...utm,
  });
}

function attachUtmToForm(form) {
  const utm = getStoredUtm();
  if (!utm) return;
  UTM_FIELDS.forEach((field) => {
    let input = form.querySelector(`input[name="${field}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = field;
      form.appendChild(input);
    }
    input.value = utm[field] || '';
  });
}

function sendGa4LeadEvent(eventName, extraParams = {}) {
  const utm = getStoredUtm() || {};
  const params = {
    ...utm,
    ...extraParams,
  };
  if (typeof gtag === 'function') {
    console.log('[UTM Tracker] GA4 event:', eventName, params);
    gtag('event', eventName, params);
  } else {
    console.log('[UTM Tracker] gtag unavailable:', eventName, params);
  }
}

function initUtmTracker() {
  preserveFirstTouchUtm();
  pushPageViewDataLayer();
  const forms = [
    document.getElementById('applyForm'),
    document.getElementById('floatForm'),
  ].filter(Boolean);
  forms.forEach(attachUtmToForm);
}

window.mypaulUtmTracker = {
  parseUtmParams,
  getStoredUtm,
  attachUtmToForm,
  pushFormSubmitDataLayer,
  pushGenerateLeadDataLayer,
  sendGa4LeadEvent,
  initUtmTracker,
};

document.addEventListener('DOMContentLoaded', initUtmTracker);
