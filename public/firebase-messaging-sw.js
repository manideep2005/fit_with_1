// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2EJ2UwHchs7YxO9f2-94c2uQyTXTUToY",
  authDomain: "fit-with-ai-b005e.firebaseapp.com",
  projectId: "fit-with-ai-b005e",
  storageBucket: "fit-with-ai-b005e.appspot.com",
  messagingSenderId: "123456789", // You'll need to get this from Firebase Console
  appId: "1:123456789:web:abcdef123456" // You'll need to get this from Firebase Console
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const { notification, data } = payload;
  
  let notificationTitle = notification?.title || 'Fit-With-AI';
  let notificationOptions = {
    body: notification?.body || 'You have a new message',
    icon: notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data?.type || 'default',
    data: data || {},
    requireInteraction: false,
    silent: false
  };

  // Customize notification based on type
  if (data?.type === 'chat_message') {
    notificationTitle = `New message from ${data.senderName}`;
    notificationOptions.body = data.message || notification?.body;
    notificationOptions.icon = data.senderAvatar || '/favicon.ico';
    notificationOptions.tag = `chat-${data.senderId}`;
    notificationOptions.data = {
      type: 'chat_message',
      senderId: data.senderId,
      senderName: data.senderName,
      url: '/chat'
    };
  } else if (data?.type === 'friend_request') {
    notificationTitle = 'New Friend Request';
    notificationOptions.body = `${data.senderName} sent you a friend request`;
    notificationOptions.icon = data.senderAvatar || '/favicon.ico';
    notificationOptions.tag = 'friend-request';
    notificationOptions.requireInteraction = true;
    notificationOptions.data = {
      type: 'friend_request',
      senderId: data.senderId,
      senderName: data.senderName,
      url: '/chat'
    };
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const url = data.url || '/chat';
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          // Focus existing window and send message
          client.focus();
          
          // Send message to client about the notification click
          client.postMessage({
            type: 'notification_click',
            data: data
          });
          
          return;
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url).then((client) => {
          // Send message to new client
          if (client) {
            setTimeout(() => {
              client.postMessage({
                type: 'notification_click',
                data: data
              });
            }, 1000);
          }
        });
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Optional: Track notification dismissal
  const data = event.notification.data || {};
  
  if (data.type === 'chat_message') {
    // Could send analytics or update read status
    console.log('Chat notification dismissed');
  }
});

// Service Worker activation
self.addEventListener('activate', (event) => {
  console.log('Firebase messaging service worker activated');
});

// Service Worker installation
self.addEventListener('install', (event) => {
  console.log('Firebase messaging service worker installed');
  self.skipWaiting();
});