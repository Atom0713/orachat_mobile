import { Stack } from "expo-router";
import React from "react";

import { ensureMessagesHydrated } from "../src/chat/inMemoryMessageStore";

export default function RootLayout() {
  React.useEffect(() => {
    void ensureMessagesHydrated();
  }, []);
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
