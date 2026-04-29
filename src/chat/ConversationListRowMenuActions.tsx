import { Pressable, StyleSheet, Text } from "react-native";

import { Theme } from "../theme/colors";

export type ConversationListRowMenuActionsProps = {
  onDeletePress: () => void | Promise<void>;
};

export function ConversationListRowMenuActions({ onDeletePress }: ConversationListRowMenuActionsProps) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel="Delete chat"
      onPress={() => void onDeletePress()}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Text style={styles.itemLabel}>Delete Chat</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemPressed: { backgroundColor: Theme.listRowPressed },
  itemLabel: { fontSize: 17, color: Theme.primaryText },
});
