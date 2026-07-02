// Pass-through fetch handler — required for PWA installability
self.addEventListener('fetch', function (e) {
  e.respondWith(fetch(e.request));
});

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Must match the config in booking.js and admin.js
firebase.initializeApp({
  apiKey: "AIzaSyBWQwG1eSAnEPotMSnABuPl4xBLxnvbKgE",
  authDomain: "salon-booking-72d67.firebaseapp.com",
  projectId: "salon-booking-72d67",
  storageBucket: "salon-booking-72d67.firebasestorage.app",
  messagingSenderId: "302394452383",
  appId: "1:302394452383:web:b244e4cdaf162fae0175aa"
});

const messaging = firebase.messaging();

// Handle background push messages (when app is closed/minimised)
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data
  });
});

// Open admin page when notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/admin.html'));
});
