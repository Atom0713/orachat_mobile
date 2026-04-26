/**
 * WhatsApp-inspired palette (current light theme: post-2024 refresh —
 * warmer neutrals, #008069 chrome, mint outgoing bubbles vs legacy #128C7E / #ECE5DD / #DCF8C6).
 */
export const Theme = {
  /** Top bar, primary actions (current WA green, not legacy #128C7E). */
  headerBackground: "#008069",
  sendButton: "#008069",
  sendDisabled: "rgba(0, 128, 105, 0.42)",

  /** List / form screens (matches stack content under header). */
  screenBackground: "#FFFFFF",

  /** Chat message list backdrop (warm neutral, not legacy paper #ECE5DD). */
  chatWallpaper: "#EFEAE2",

  /** Outgoing bubble (mint, not legacy yellow-green #DCF8C6). */
  bubbleOutgoing: "#D9FDD3",
  bubbleIncoming: "#FFFFFF",
  bubbleIncomingBorder: "rgba(31, 44, 51, 0.08)",

  primaryText: "#1F2C33",
  secondaryText: "#8696A0",

  inputBackground: "#FFFFFF",
  inputBorder: "rgba(31, 44, 51, 0.12)",
  hairlineBorder: "rgba(31, 44, 51, 0.10)",

  /** Brand accent (ticks, badges). */
  unreadAccent: "#25D366",

  listRowPressed: "#F5F4F0",
} as const;
