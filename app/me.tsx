import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StatusBar as RNStatusBar, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { LocalUser } from "../src/user/userStore";
import { getLocalUser } from "../src/user/userStore";

export default function MeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    const goRegister = () => router.replace("/register" as never);
    getLocalUser()
      .then((u) => {
        if (!u) goRegister();
        else setUser(u);
      })
      .catch(goRegister)
      .finally(() => setCheckingUser(false));
  }, [router]);

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
      return { headerShown: false as const };
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
      {(checkingUser || user) && (
        <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAFF" },
});
