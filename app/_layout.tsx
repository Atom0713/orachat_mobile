import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ensureMessagesHydrated } from "../src/chat/datastore";
import { bootstrapE2EForUser } from "../src/crypto/e2e";
import { Theme } from "../src/theme/colors";
import { getLocalUser } from "../src/user/userStore";

export default function RootLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const resolved = useRef(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && !resolved.current) setHasUser(false);
    }, 5000);
    ensureMessagesHydrated()
      .then(() => getLocalUser())
      .then(async (user) => {
        if (user) {
          try {
            await bootstrapE2EForUser(user.id);
          } catch (e) {
            console.warn("[e2e] bootstrap failed", e);
          }
        }
        if (!cancelled) {
          resolved.current = true;
          setHasUser(!!user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          resolved.current = true;
          setHasUser(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (hasUser === null || hasRedirected.current) return;
    hasRedirected.current = true;
    if (hasUser) {
      router.replace("/chats" as never);
    } else {
      router.replace("/register" as never);
    }
  }, [hasUser, router]);

  // Do not render the Stack until auth is resolved. Rendering it before we know
  // the target route causes Fabric to mount screens into the stack before the
  // correct route is ready, producing "ScreenStackFragment added into a
  // non-stack container" on fast real devices.
  if (hasUser === null) {
    return <StatusBar style="dark" />;
  }

  const androidHeaderStatusBarHeight =
    Platform.OS === "android"
      ? Math.max(insets.top, RNStatusBar.currentHeight ?? 0) || 24
      : undefined;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Theme.screenBackground },
          headerTintColor: "#000000",
          headerTitleStyle: { fontWeight: "600", color: "#000000" },
          contentStyle: { backgroundColor: Theme.screenBackground },
          // iOS: do not set statusBarStyle here — RN Screens calls native APIs that
          // require UIViewControllerBasedStatusBarAppearance (false in Expo Go).
          // Use <StatusBar /> above instead. Android keeps native stack status bar.
          ...(Platform.OS === "android"
            ? {
                statusBarStyle: "dark",
                ...(androidHeaderStatusBarHeight != null
                  ? { headerStatusBarHeight: androidHeaderStatusBarHeight }
                  : {}),
              }
            : {}),
        }}
      />
    </>
  );
}
