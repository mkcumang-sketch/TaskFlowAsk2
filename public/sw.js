self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.json();
  const options = {
    body: data.body || "You have a new update in TaskFlow",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: data.url || "/my-day",
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title || "TaskFlow Alert", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});