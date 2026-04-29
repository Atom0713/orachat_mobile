import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Theme } from "../theme/colors";

import { deleteConversationAndMessages } from "./conversationStore";
import { ConversationListRowMenuActions } from "./ConversationListRowMenuActions";

export type ConversationListRowMenuProps = {
  conversationId: number;
};

export function ConversationListRowMenu({ conversationId }: ConversationListRowMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const onDeletePress = useCallback(async () => {
    await deleteConversationAndMessages(conversationId);
    close();
  }, [conversationId, close]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Conversation options"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={Theme.secondaryText} />
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Dismiss menu" />
          <View style={styles.popup}>
            <ConversationListRowMenuActions onDeletePress={onDeletePress} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { justifyContent: "center", paddingLeft: 4, paddingVertical: 4 },
  triggerPressed: { opacity: 0.65 },
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  popup: {
    position: "absolute",
    left: 24,
    right: 24,
    top: "36%",
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: Theme.screenBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.hairlineBorder,
  },
});
