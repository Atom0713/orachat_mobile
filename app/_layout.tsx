import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
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
