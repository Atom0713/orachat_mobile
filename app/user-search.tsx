import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { searchUsers, type SearchUser } from "../src/api/users";
import { getOrCreateConversation, setConversationDisplayName } from "../src/chat/conversationStore";

export default function UserSearchScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const users = await searchUsers(q);
      setResults(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const onSelectUser = useCallback(
    async (item: SearchUser) => {
      const recipientDisplayName = item.display_name ?? item.username ?? item.id;
      const conversation = await getOrCreateConversation(item.id);
      await setConversationDisplayName(conversation.id, recipientDisplayName);
      router.push({
        pathname: "/",
        params: {
          recipientId: item.id,
          recipientDisplayName,
          conversationId: String(conversation.id),
        },
      } as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchUser }) => {
      const displayName = item.display_name ?? item.username ?? item.id;
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelectUser(item)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
        >
          <Text style={styles.resultText}>{displayName}</Text>
          {item.username && item.username !== displayName && (
            <Text style={styles.resultSubtext}>@{item.username}</Text>
          )}
        </Pressable>
      );
    },
    [onSelectUser]
  );

  const hasSearched = results.length > 0 || (query.trim().length > 0 && !loading);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          title: "Find users",
          headerBackTitle: "",
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <View style={styles.container}>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setError(null);
              }}
              placeholder="Search by name or username…"
              placeholderTextColor="#6B7A90"
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={() => void onSearch()}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void onSearch()}
              disabled={loading || !query.trim()}
              style={({ pressed }) => [
                styles.searchBtn,
                (!query.trim() || loading) && styles.searchBtnDisabled,
                pressed && query.trim() && !loading && styles.searchBtnPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={22} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {hasSearched && !loading && results.length === 0 && !error && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}

          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={results}
            keyExtractor={(u) => u.id}
            renderItem={renderItem}
            keyboardDismissMode="on-drag"
            ListEmptyComponent={null}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5FAFF" },
  keyboardAvoid: { flex: 1 },
  container: { flex: 1 },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(11, 95, 255, 0.12)",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
    borderRadius: 14,
    color: "#102A43",
    backgroundColor: "#F8FBFF",
    fontSize: 16,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0B5FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnPressed: { opacity: 0.9 },
  searchBtnDisabled: { backgroundColor: "rgba(11, 95, 255, 0.45)" },

  errorBox: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  errorText: { color: "#C41E3A", fontSize: 14 },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: "#6B7A90", fontSize: 16 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },

  resultRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(11, 95, 255, 0.18)",
  },
  resultRowPressed: { opacity: 0.8 },
  resultText: { color: "#102A43", fontSize: 16, fontWeight: "600" },
  resultSubtext: { color: "#6B7A90", fontSize: 14, marginTop: 2 },
});
