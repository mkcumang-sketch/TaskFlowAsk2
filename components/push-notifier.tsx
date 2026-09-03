"use client";

import { useEffect, useState } from "react";

export function PushNotifier() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      const timer = window.setTimeout(() => setPermission(Notification.permission), 0);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service worker registration failed:", err);
        });
      }
      return () => window.clearTimeout(timer);
    }
  }, []);

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const res = await Notification.requestPermission();
    setPermission(res);

    if (res === "granted" && "serviceWorker" in navigator) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert("Push notifications are not configured.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // Standard lightweight push registration
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
    }
  };

  if (permission === "granted") return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 shadow-sm">
      <span>Enable mobile & browser push notifications to get alerted as soon as deadlines or tasks change.</span>
      <button
        onClick={enableNotifications}
        className="ml-4 rounded-xl bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 transition shrink-0"
      >
        Allow Alerts
      </button>
    </div>
  );
}