import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { createInvite } from "../src/api/invites";
import type { LocalUser } from "../src/user/userStore";
import { getLocalUser } from "../src/user/userStore";

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  const onGenerateInvite = useCallback(async () => {
    if (!user) return;
    setInviteLoading(true);
    try {
      const inv = await createInvite({ created_by: user.id });
      const expiresLabel = new Date(inv.expires_at).toLocaleString();
      Alert.alert("Invite code", `${inv.code}\n\nExpires: ${expiresLabel}`);
    } catch (e) {
      Alert.alert("Could not create invite", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setInviteLoading(false);
    }
  }, [user]);

  useEffect(() => {
    getLocalUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setCheckingUser(false));
  }, []);

  const androidHeaderStatusBarHeight =
    Platform.OS === "android"
      ? Math.max(insets.top, RNStatusBar.currentHeight ?? 0) || 24
      : undefined;

  const stackOptions = React.useMemo(() => {
    const androidExtras =
      Platform.OS === "android" && androidHeaderStatusBarHeight != null
        ? {
            statusBarTranslucent: true as const,
            headerStatusBarHeight: androidHeaderStatusBarHeight,
          }
        : {};
    if (checkingUser) {
      return {
        headerShown: true as const,
        title: "\u2026",
        ...androidExtras,
      };
    }
    if (!user) {
      return {
        headerShown: true as const,
        title: "Me",
        ...androidExtras,
      };
    }
    return {
      headerShown: true as const,
      title: user.username,
      ...androidExtras,
    };
  }, [checkingUser, user, androidHeaderStatusBarHeight]);

  return (
    <>
      <Stack.Screen options={stackOptions} />
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        {user && !checkingUser ? (
          <View style={styles.container}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Generate invite code"
              onPress={() => void onGenerateInvite()}
              disabled={inviteLoading}
              style={({ pressed }) => [
                styles.inviteBtn,
                inviteLoading && styles.inviteBtnDisabled,
                pressed && !inviteLoading && styles.inviteBtnPressed,
              ]}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.inviteBtnText}>Generate invite code</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAFF" },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  inviteBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0B5FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  inviteBtnPressed: { opacity: 0.9 },
  inviteBtnDisabled: { opacity: 0.65 },
  inviteBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
