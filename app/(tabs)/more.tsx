import { StyleSheet, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { MenuListItem } from "@/components/MenuListItem";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/ui/StatCard";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import { ADMIN_NAV, TOOLS_NAV } from "@/constants/navigation";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

export default function MoreScreen() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { profile, user, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const initial = (profile?.fullName || user?.name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <ScreenShell title={isDesktop ? "Conta" : "Mais"}>
      <ScreenScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={fontStyles.titleM}>
              {profile?.fullName || user?.name || "Operador"}
            </Text>
            <Text style={fontStyles.bodyM}>{profile?.email || user?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{profile?.role ?? "—"}</Text>
            </View>
          </View>
        </View>

        {!isDesktop ? (
          <SectionCard title="Ferramentas">
            {TOOLS_NAV.map((item) => (
              <MenuListItem
                key={item.href}
                label={item.label}
                icon={item.icon}
                onPress={() => router.push(item.href as never)}
              />
            ))}
          </SectionCard>
        ) : (
          <View style={styles.desktopHint}>
            <Ionicons name="desktop-outline" size={20} color={colors.primary} />
            <Text style={fontStyles.bodyM}>
              Ferramentas e administração estão no menu lateral.
            </Text>
          </View>
        )}

        {!isDesktop && isAdmin ? (
          <SectionCard title="Administração">
            <MenuListItem
              label="Equipe & Rotas"
              icon="people-circle-outline"
              badge="Admin"
              onPress={() => router.push("/(stack)/team-overview")}
            />
            {ADMIN_NAV.filter((item) => item.href !== "/(stack)/team-overview").map(
              (item) => (
                <MenuListItem
                  key={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge="Admin"
                  onPress={() => router.push(item.href as never)}
                />
              ),
            )}
          </SectionCard>
        ) : null}

        <PrimaryButton
          label="Sair da conta"
          onPress={signOut}
          variant="secondary"
        />
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 22, fontWeight: "700" },
  profileInfo: { flex: 1, gap: 4 },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "capitalize",
  },
  desktopHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
