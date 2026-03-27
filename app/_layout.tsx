import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import { ensureMessagesHydrated } from "../src/chat/inMemoryMessageStore";
import { bootstrapE2EForUser } from "../src/crypto/e2e";
import { getLocalUser } from "../src/user/userStore";

export default function RootLayout() {
  const router = useRouter();
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

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B5FFF" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#F5FAFF" },
      }}
    />
  );
}
