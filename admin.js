import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

// ─── CONFIG — same values as booking.js and sw.js ────────────
const firebaseConfig = {
  apiKey: "AIzaSyBWQwG1eSAnEPotMSnABuPl4xBLxnvbKgE",
  authDomain: "salon-booking-72d67.firebaseapp.com",
  projectId: "salon-booking-72d67",
  storageBucket: "salon-booking-72d67.firebasestorage.app",
  messagingSenderId: "302394452383",
  appId: "1:302394452383:web:b244e4cdaf162fae0175aa",
  measurementId: "G-01B9QBJCRB"
};

const VAPID_KEY = "clLmWL5UQewpPZFh-ttdWjIrWLUts3MtQ9bxZog50jI";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

// ─── AUTH GATE ────────────────────────────────────────────────
const gate = document.getElementById('adminGate');
const dash = document.getElementById('adminDash');

onAuthStateChanged(auth, user => {
  if (user) {
    gate.style.display = 'none';
    dash.style.display = 'block';
    // Explicitly show the default (bookings) panel
    document.getElementById('tab-bookings').style.display = 'block';
    document.getElementById('tab-hours').style.display = 'none';
    initDash();
  } else {
    gate.style.display = 'flex';
    dash.style.display = 'none';
  }
});

document.getElementById('adminLogin').addEventListener('click', login);
document.getElementById('adminPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

async function login() {
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errEl    = document.getElementById('adminError');
  errEl.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = 'Incorrect email or password.';
  }
}

document.getElementById('adminLogout').addEventListener('click', () => signOut(auth));

// ─── DASHBOARD ────────────────────────────────────────────────
let allBookings = [];
let currentFilter = 'all';
let searchTerm = '';
let isFirstLoad = true;

function initDash() {
  loadHours();
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));

  onSnapshot(q, snap => {
    const incoming = [];
    snap.forEach(d => incoming.push({ id: d.id, ...d.data() }));

    // Detect new booking (not on first load)
    if (!isFirstLoad && incoming.length > allBookings.length) {
      const newest = incoming[0];
      triggerNewBookingAlert(newest);
    }

    allBookings = incoming;
    isFirstLoad = false;
    updateStats();
    renderBookings();
  });
}

// ─── STATS ───────────────────────────────────────────────────
function updateStats() {
  const todayKey = todayDateKey();
  const weekStart = getWeekStart();

  document.getElementById('statTotal').textContent = allBookings.length;
  document.getElementById('statToday').textContent = allBookings.filter(b => b.dateKey === todayKey).length;
  document.getElementById('statPending').textContent = allBookings.filter(b => b.status === 'pending').length;
  document.getElementById('statThisWeek').textContent = allBookings.filter(b => {
    const d = b.date?.toDate ? b.date.toDate() : new Date(b.dateKey);
    return d >= weekStart;
  }).length;
}

function todayDateKey() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ─── FILTERS + SEARCH ────────────────────────────────────────
document.querySelectorAll('.admin-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderBookings();
  });
});

document.getElementById('adminSearch').addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase();
  renderBookings();
});

// ─── RENDER BOOKINGS ─────────────────────────────────────────
function renderBookings() {
  const container = document.getElementById('adminBookings');

  let filtered = allBookings;

  if (currentFilter !== 'all') {
    filtered = filtered.filter(b => b.status === currentFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(b =>
      b.name?.toLowerCase().includes(searchTerm) ||
      b.service?.toLowerCase().includes(searchTerm) ||
      b.email?.toLowerCase().includes(searchTerm)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="admin-empty">No bookings found</div>';
    return;
  }

  container.innerHTML = filtered.map(b => {
    const date = b.date?.toDate ? b.date.toDate() : new Date(b.dateKey);
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="booking-row" id="row-${b.id}">
        <div>
          <div class="booking-row__name">${esc(b.name)}</div>
          <div class="booking-row__contact">${esc(b.phone)} · ${esc(b.email)}</div>
          ${b.notes ? `<div class="booking-row__contact" style="margin-top:4px;font-style:italic">"${esc(b.notes)}"</div>` : ''}
        </div>
        <div>
          <div class="booking-row__service">${esc(b.service)}</div>
          <div class="booking-row__price">${esc(b.price)}</div>
        </div>
        <div class="booking-row__datetime">${dateStr}<br />${esc(b.time)}</div>
        <div class="booking-row__datetime" style="color:var(--text-muted);font-size:11px">
          Ref: ${b.id.slice(0,8).toUpperCase()}<br />
          ${b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('en-GB') : ''}
        </div>
        <div class="booking-row__status">
          <select data-id="${b.id}" data-status="${b.status}" onchange="updateStatus(this)">
            <option value="pending"   ${b.status==='pending'   ? 'selected':''}>Pending</option>
            <option value="confirmed" ${b.status==='confirmed' ? 'selected':''}>Confirmed</option>
            <option value="cancelled" ${b.status==='cancelled' ? 'selected':''}>Cancelled</option>
          </select>
          <button class="booking-row__delete" onclick="confirmDelete('${b.id}', '${esc(b.name)}', '${esc(b.service)}')" title="Delete booking">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Update booking status in Firestore
window.updateStatus = async function(select) {
  const id = select.dataset.id;
  const status = select.value;
  select.dataset.status = status;
  await updateDoc(doc(db, 'bookings', id), { status });
};

// Delete booking
window.confirmDelete = function(id, name, service) {
  const overlay = document.getElementById('deleteModal');
  document.getElementById('deleteModalName').textContent = `${name} — ${service}`;
  overlay.classList.add('open');
  document.getElementById('deleteConfirmBtn').onclick = async () => {
    try {
      await deleteDoc(doc(db, 'bookings', id));
      overlay.classList.remove('open');
    } catch (e) {
      alert('Could not delete. Check your connection and try again.');
    }
  };
};

document.getElementById('deleteCancelBtn').addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('open');
});
document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target === document.getElementById('deleteModal')) {
    document.getElementById('deleteModal').classList.remove('open');
  }
});

// ─── ALERT PREFERENCES (vibrate / beep) ──────────────────────
(function initAlertPrefs() {
  const vibrateChk = document.getElementById('alertVibrate');
  const soundChk   = document.getElementById('alertSound');
  const vibrateTrack = document.getElementById('vibrateTrack');
  const soundTrack   = document.getElementById('soundTrack');

  // Load saved prefs
  vibrateChk.checked = localStorage.getItem('alertVibrate') === '1';
  soundChk.checked   = localStorage.getItem('alertSound')   === '1';
  updateTrack(vibrateTrack, vibrateChk.checked);
  updateTrack(soundTrack,   soundChk.checked);

  // Hide vibrate option on iOS (navigator.vibrate not supported)
  if (!navigator.vibrate) {
    document.getElementById('vibrateLabel').style.display = 'none';
  }

  vibrateChk.addEventListener('change', () => {
    localStorage.setItem('alertVibrate', vibrateChk.checked ? '1' : '0');
    updateTrack(vibrateTrack, vibrateChk.checked);
  });

  soundChk.addEventListener('change', () => {
    localStorage.setItem('alertSound', soundChk.checked ? '1' : '0');
    updateTrack(soundTrack, soundChk.checked);
    if (soundChk.checked) playBeep(); // preview the sound
  });

  function updateTrack(track, on) {
    track.style.background = on ? 'var(--gold)' : '';
    track.querySelector('.hours-toggle-thumb').style.transform = on ? 'translateX(18px)' : '';
  }
}());

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    ctx.close();
  } catch (e) {
    console.warn('Beep failed:', e.message);
  }
}

// ─── NEW BOOKING ALERT ────────────────────────────────────────
function triggerNewBookingAlert(booking) {
  // Push notification
  if (Notification.permission === 'granted') {
    new Notification('New Booking — Da Cuts', {
      body: `${booking.name} · ${booking.service} · ${booking.dateKey} at ${booking.time}`,
      icon: './icons/icon.svg'
    });
  }

  // Vibrate (Android only — iOS ignores navigator.vibrate)
  if (localStorage.getItem('alertVibrate') === '1' && navigator.vibrate) {
    navigator.vibrate([300, 100, 300, 100, 300]);
  }

  // Beep
  if (localStorage.getItem('alertSound') === '1') {
    playBeep();
  }

  // Highlight the new booking row
  setTimeout(() => {
    const row = document.getElementById(`row-${booking.id}`);
    if (row) row.classList.add('booking-row__new');
  }, 300);
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────
const notifyBtn = document.getElementById('enableNotifications');

// Check if already enabled
if (Notification.permission === 'granted') {
  notifyBtn.textContent = '🔔 Notifications On';
  notifyBtn.classList.add('enabled');
}

notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('This browser does not support notifications.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Notification permission denied. Enable it in your browser settings.');
    return;
  }

  notifyBtn.textContent = '🔔 Notifications On';
  notifyBtn.classList.add('enabled');

  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('FCM Token (save this or store in Firestore):', token);

    // Handle foreground messages
    onMessage(messaging, payload => {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icons/icon-192.png'
      });
    });
  } catch (e) {
    // FCM requires HTTPS in production — falls back to in-app only on localhost
    console.warn('FCM token error (normal on localhost):', e.message);
  }
});

// ─── TAB SWITCHING ───────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    // Explicitly hide all panels (don't rely on CSS alone — inline styles can override)
    document.querySelectorAll('.admin-tab-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    tab.classList.add('active');
    const panel = document.getElementById(`tab-${tab.dataset.tab}`);
    panel.classList.add('active');
    panel.style.display = 'block';

    // Ensure hours grid is always populated when the hours tab is opened
    if (tab.dataset.tab === 'hours') {
      const grid = document.getElementById('hoursGrid');
      if (!grid.querySelector('.hours-row')) renderHoursGrid();
    }
  });
});

// ─── BUSINESS HOURS ───────────────────────────────────────────
const DAYS = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
];

const DEFAULT_HOURS = {
  monday:    { open: true, start: '09:00', end: '20:00' },
  tuesday:   { open: true, start: '09:00', end: '20:00' },
  wednesday: { open: true, start: '09:00', end: '20:00' },
  thursday:  { open: true, start: '09:00', end: '20:00' },
  friday:    { open: true, start: '09:00', end: '20:00' },
  saturday:  { open: true, start: '08:00', end: '19:00' },
  sunday:    { open: true, start: '10:00', end: '17:00' },
};

let currentHours = { ...DEFAULT_HOURS };

async function loadHours() {
  // Render defaults immediately so the grid is never blank
  renderHoursGrid();

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    const snap = await Promise.race([getDoc(doc(db, 'settings', 'hours')), timeout]);
    if (snap.exists()) {
      currentHours = snap.data();
      renderHoursGrid(); // Re-render with saved data
    }
  } catch (e) {
    console.warn('Could not load hours from Firestore:', e.message);
    // Grid already showing defaults — nothing more to do
  }
}

function renderHoursGrid() {
  const grid = document.getElementById('hoursGrid');
  grid.innerHTML = DAYS.map(({ key, label }) => {
    const h = currentHours[key] || DEFAULT_HOURS[key];
    return `
      <div class="hours-row">
        <span class="hours-day">${label}</span>
        <label class="hours-toggle">
          <input type="checkbox" data-day="${key}" class="hours-open-chk" ${h.open ? 'checked' : ''} />
          <span class="hours-toggle-track"><span class="hours-toggle-thumb"></span></span>
          <span class="hours-toggle-label">${h.open ? 'Open' : 'Closed'}</span>
        </label>
        <div class="hours-times ${h.open ? '' : 'hidden'}" id="times-${key}">
          <input type="time" class="hours-time" data-day="${key}" data-field="start" value="${h.start}" />
          <span class="hours-to">to</span>
          <input type="time" class="hours-time" data-day="${key}" data-field="end" value="${h.end}" />
        </div>
      </div>
    `;
  }).join('');

  // Toggle open/closed
  grid.querySelectorAll('.hours-open-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      const times = document.getElementById(`times-${chk.dataset.day}`);
      const lbl = chk.closest('.hours-toggle').querySelector('.hours-toggle-label');
      times.classList.toggle('hidden', !chk.checked);
      lbl.textContent = chk.checked ? 'Open' : 'Closed';
    });
  });
}

document.getElementById('saveHours').addEventListener('click', async () => {
  const updated = {};
  DAYS.forEach(({ key }) => {
    const chk   = document.querySelector(`.hours-open-chk[data-day="${key}"]`);
    const start = document.querySelector(`.hours-time[data-day="${key}"][data-field="start"]`);
    const end   = document.querySelector(`.hours-time[data-day="${key}"][data-field="end"]`);
    updated[key] = {
      open:  chk.checked,
      start: start.value,
      end:   end.value,
    };
  });

  const btn = document.getElementById('saveHours');
  const msg = document.getElementById('hoursSaveMsg');
  btn.textContent = 'Saving…';
  btn.disabled = true;
  msg.textContent = '';

  try {
    await setDoc(doc(db, 'settings', 'hours'), updated);
    currentHours = updated;
    msg.style.color = '#6fcf97';
    msg.textContent = '✓ Hours saved successfully.';
    btn.textContent = 'Save Hours ↗';
    btn.disabled = false;
    setTimeout(() => { msg.textContent = ''; }, 4000);
  } catch (e) {
    msg.style.color = '#e05050';
    msg.textContent = 'Failed to save — ' + (e.code === 'permission-denied'
      ? 'Firestore rules not updated. Go to Firebase Console → Firestore → Rules and publish the rules.'
      : e.message || 'check your connection and try again.');
    btn.textContent = 'Save Hours ↗';
    btn.disabled = false;
  }
});

// ─── CHANGE PASSWORD MODAL ────────────────────────────────────
const passwordModal  = document.getElementById('passwordModal');
const passwordError  = document.getElementById('passwordError');
const passwordSuccess = document.getElementById('passwordSuccess');

document.getElementById('changePasswordBtn').addEventListener('click', () => {
  passwordModal.classList.add('open');
  passwordError.textContent = '';
  passwordSuccess.textContent = '';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
});

document.getElementById('passwordModalClose').addEventListener('click', closeModal);
passwordModal.addEventListener('click', e => { if (e.target === passwordModal) closeModal(); });
function closeModal() { passwordModal.classList.remove('open'); }

document.getElementById('savePassword').addEventListener('click', async () => {
  const current = document.getElementById('currentPassword').value;
  const next    = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  passwordError.textContent = '';
  passwordSuccess.textContent = '';

  if (!current || !next || !confirm) {
    passwordError.textContent = 'Please fill in all fields.'; return;
  }
  if (next.length < 8) {
    passwordError.textContent = 'New password must be at least 8 characters.'; return;
  }
  if (next !== confirm) {
    passwordError.textContent = 'New passwords do not match.'; return;
  }

  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, current);

  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, next);
    passwordSuccess.textContent = 'Password updated successfully.';
    setTimeout(closeModal, 2000);
  } catch (e) {
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
      passwordError.textContent = 'Current password is incorrect.';
    } else {
      passwordError.textContent = 'Something went wrong. Please try again.';
    }
  }
});
