import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import {
  ADMIN_NAV,
  MAIN_NAV,
  TOOLS_NAV,
  type NavItem,
} from "@/constants/navigation";
import { colors, layout, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

function isActive(pathname: string, href: string): boolean {
  const normalized = href.replace("/(tabs)", "").replace("/(stack)", "");
  if (href === "/(tabs)" || href === "/(tabs)/") {
    return pathname === "/" || pathname === "/index" || pathname.endsWith("/index");
  }
  return pathname.includes(normalized) && normalized.length > 0;
}

function NavLink({ item }: { item: NavItem }) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const active = isActive(pathname, item.href);

  const navigate = () => {
    const href = item.href as never;
    if (isDesktop && Platform.OS === "web") {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.link, active && styles.linkActive]}
      onPress={navigate}
      accessibilityRole="link"
    >
      <Ionicons
        name={active ? (item.iconActive ?? item.icon) : item.icon}
        size={20}
        color={active ? colors.sidebarActive : colors.sidebarText}
      />
      <Text style={[styles.linkLabel, active && styles.linkLabelActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <NavLink key={item.href} item={item} />
      ))}
    </View>
  );
}

export function Sidebar() {
  const { profile, user, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Ionicons name="leaf" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.brandName}>RioCred</Text>
          <Text style={styles.brandTag}>Crédito comunitário</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <NavSection title="Principal" items={MAIN_NAV} />
        <NavSection title="Ferramentas" items={TOOLS_NAV} />
        {isAdmin ? <NavSection title="Administração" items={ADMIN_NAV} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.fullName || user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.fullName || user?.name || "Operador"}
            </Text>
            <Text style={styles.userRole}>{profile?.role ?? "—"}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.sidebarText} />
          <Text style={styles.signOutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: layout.sidebarWidth,
    flexShrink: 0,
    backgroundColor: colors.sidebar,
    height: "100%",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  brandTag: {
    fontSize: 11,
    color: colors.sidebarText,
    marginTop: 1,
  },
  nav: { flex: 1 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    ...fontStyles.caption,
    color: "rgba(255,255,255,0.45)",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  linkActive: {
    backgroundColor: colors.sidebarActiveBg,
  },
  linkLabel: {
    fontSize: 14,
    color: colors.sidebarText,
    fontWeight: "500",
  },
  linkLabelActive: {
    color: colors.sidebarActive,
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  userInfo: { flex: 1 },
  userName: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  userRole: { color: colors.sidebarText, fontSize: 11, textTransform: "capitalize" },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  signOutText: { color: colors.sidebarText, fontSize: 13 },
});
