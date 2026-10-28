import "react-native-url-polyfill/auto";
import { Stack, useRouter, useSegments } from "expo-router";
import { Platform, View } from "react-native";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import Head from "expo-router/head";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import { LoadingScreen } from "@/components/ScreenShell";
import { AppShell } from "@/components/layout/AppShell";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";
import { LocalReminders } from "@/hooks/useLocalReminders";
import { useRealtimeInvalidate } from "@/lib/realtime";
import { colors } from "@/styles/theme";

const stackScreenOptions = {
  headerShown: false,
  contentStyle: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden" as const,
    backgroundColor: colors.background,
  },
  ...(Platform.OS === "web"
    ? { animation: "none" as const, animationEnabled: false }
    : null),
};

function AppNavigator() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(stack)" />
    </Stack>
  );
}

function AuthGate() {
  const { user, profile, isLoading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Realtime subscriptions para invalidar queries automaticamente
  useRealtimeInvalidate(queryClient);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === "(auth)" || segments[0] === "login";

    if (!user && !inAuth) {
      router.replace("/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (
    user &&
    profile?.role === "manager" &&
    !profile.isApproved
  ) {
    return <PendingApprovalScreen onSignOut={signOut} />;
  }

  const inAuth = segments[0] === "(auth)" || segments[0] === "login";
  const showShell = Boolean(user && !inAuth);

  if (showShell) {
    return (
      <AppShell>
        <LocalReminders />
        <AppNavigator />
      </AppShell>
    );
  }

  return <AppNavigator />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!loaded) {
    return <LoadingScreen label="Iniciando RioCred…" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <View
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: colors.background,
            overflow: "hidden",
            width: "100%",
            ...(Platform.OS === "web" ? { height: "100vh" } : null),
          }}
        >
          {Platform.OS === "web" && (
            <Head>
              <title>RioCred</title>
              <meta
                name="description"
                content="Gestão de crédito comunitário"
              />
              <link
                href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
                rel="stylesheet"
              />
              <style
                dangerouslySetInnerHTML={{
                  __html:
                    "html, body, #root { height: 100%; margin: 0; overflow: hidden; max-width: 100%; }",
                }}
              />
            </Head>
          )}
          <AuthGate />
        </View>
      </AuthProvider>
    </QueryClientProvider>
  );
}
