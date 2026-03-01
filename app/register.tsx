import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { registerUser } from "../src/api/users";
import { getLocalUser, setLocalUser } from "../src/user/userStore";

const USERNAME_MIN_LEN = 3;
const USERNAME_MAX_LEN = 32;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

function validateUsername(value: string): string | null {
  const t = value.trim();
  if (t.length < USERNAME_MIN_LEN) return `At least ${USERNAME_MIN_LEN} characters`;
  if (t.length > USERNAME_MAX_LEN) return `At most ${USERNAME_MAX_LEN} characters`;
  if (!USERNAME_PATTERN.test(t)) return "Only letters, numbers, and underscores";
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    getLocalUser()
      .then((user) => {
        if (user) router.replace("/");
        else setCheckingUser(false);
      })
      .catch(() => setCheckingUser(false));
  }, [router]);

  const onSubmit = useCallback(async () => {
    const displayName = username.trim();
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    const normalizedUsername = displayName.toLowerCase();
    try {
      const res = await registerUser({
        username: normalizedUsername,
        display_name: displayName,
      });
      await setLocalUser({
        id: res.id,
        username: res.username,
        display_name: res.display_name ?? displayName,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }, [username, router]);

  if (checkingUser) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Stack.Screen options={{ title: "Register" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B5FFF" />
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = username.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Register",
          headerBackTitle: "",
        }}
      />

      <View style={styles.container}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            setError(null);
          }}
          placeholder="e.g. alice_dev"
          placeholderTextColor="#6B7A90"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => void onSubmit()}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void onSubmit()}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            !canSubmit && styles.submitBtnDisabled,
            pressed && canSubmit && styles.submitBtnPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Register</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAFF" },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "#102A43",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
    borderRadius: 14,
    color: "#102A43",
    backgroundColor: "#F8FBFF",
    fontSize: 16,
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  errorText: { color: "#C41E3A", fontSize: 14 },
  submitBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0B5FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnPressed: { opacity: 0.9 },
  submitBtnDisabled: { backgroundColor: "rgba(11, 95, 255, 0.45)" },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
