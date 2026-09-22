// Universal 0-dependency Web Audio synthesizers for mobile & desktop
export function playAlertChime(type: "MESSAGE" | "ASSIGNED" | "OVERDUE" | "REMINDER") {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "OVERDUE") {
      // 🚨 High-pitch alert beep
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "ASSIGNED") {
      // ⚡ Futuristic rising double chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // 💬 Pleasant bubble ping for chats / reminders
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    // Trigger mobile vibration if device supports it
    if ("vibrate" in navigator) {
      if (type === "OVERDUE") navigator.vibrate([200, 100, 200]);
      else navigator.vibrate(100);
    }
  } catch {
    // Audio context suspended or user gesture required
  }
}