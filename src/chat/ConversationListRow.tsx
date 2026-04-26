import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Theme } from "../theme/colors";
import type { ConversationWithLastMessage } from "./conversationStore";

function formatChatListTime(timestamp: number | string | null) {
  if (timestamp == null) return "";
  const d = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type ConversationListRowProps = {
  item: ConversationWithLastMessage;
  onPress: (item: ConversationWithLastMessage) => void;
};

export function ConversationListRow({ item, onPress }: ConversationListRowProps) {
  const displayName = item.display_name ?? item.peer_id;
  const timeStr = formatChatListTime(item.lastMessageAt ?? item.created_at);
  const preview =
    item.lastMessageText != null && item.lastMessageText.length > 0
      ? item.lastMessageText
      : "No messages yet";
  const isPlaceholder = item.lastMessageText == null || item.lastMessageText.length === 0;

  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text
            style={[styles.title, item.hasUnread && styles.titleUnread]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {timeStr.length > 0 ? (
            <Text style={styles.time} numberOfLines={1}>
              {timeStr}
            </Text>
          ) : null}
        </View>
        <View style={styles.previewLine}>
          <Text
            style={[
              styles.preview,
              isPlaceholder && styles.previewPlaceholder,
              item.hasUnread && !isPlaceholder && styles.previewUnread,
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {item.hasUnread ? <View style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: Theme.screenBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.hairlineBorder,
  },
  rowPressed: { backgroundColor: Theme.listRowPressed },
  body: { flex: 1, minWidth: 0 },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: Theme.primaryText,
    fontSize: 17,
    fontWeight: "400",
  },
  titleUnread: { fontWeight: "600" },
  time: {
    color: Theme.secondaryText,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  previewLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  preview: {
    flex: 1,
    minWidth: 0,
    color: Theme.secondaryText,
    fontSize: 15,
    fontWeight: "400",
  },
  previewPlaceholder: {
    fontStyle: "italic",
  },
  previewUnread: {
    color: Theme.primaryText,
    fontWeight: "500",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Theme.unreadAccent,
    flexShrink: 0,
  },
});
