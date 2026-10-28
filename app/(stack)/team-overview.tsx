import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { FilterChips } from "@/components/ui/FilterChips";
import { SectionCard, StatCard } from "@/components/ui/StatCard";
import { useTeamOverview } from "@/hooks/useTeamOverview";
import { colors, radius, shadow, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type Tab = "managers" | "routes";

export default function TeamOverviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isAdmin, isLoading, stats, managerOverviews, routeOverviews } =
    useTeamOverview();
  const [tab, setTab] = useState<Tab>("managers");
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  if (profile?.role !== "admin") {
    return (
      <ScreenShell title="Equipe & Rotas">
        <Text style={fontStyles.bodyM}>Acesso restrito a administradores.</Text>
        <PrimaryButton label="Voltar" onPress={() => router.back()} variant="ghost" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Equipe & Rotas"
      subtitle="Visão operacional sem precisar gerar relatório"
    >
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.kpiRow}>
          <StatCard
            label="Managers"
            value={String(stats.managers)}
            icon="people"
            style={styles.kpi}
          />
          <StatCard
            label="Pendentes"
            value={String(stats.pending)}
            icon="time"
            tone={stats.pending > 0 ? "warning" : "default"}
            style={styles.kpi}
          />
          <StatCard
            label="Rotas"
            value={String(stats.routes)}
            icon="map"
            style={styles.kpi}
          />
          <StatCard
            label="Clientes c/ rota"
            value={String(stats.customersWithRoute)}
            icon="person"
            tone="accent"
            style={styles.kpi}
          />
        </View>

        <FilterChips
          options={[
            { value: "managers" as const, label: "Managers" },
            { value: "routes" as const, label: "Rotas" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : tab === "managers" ? (
          <SectionCard
            title="Managers"
            action={
              <PrimaryButton
                label="Aprovar"
                variant="secondary"
                onPress={() => router.push("/(stack)/admin-approvals")}
              />
            }
          >
            {managerOverviews.length === 0 ? (
              <Text style={fontStyles.bodyM}>Nenhum manager cadastrado.</Text>
            ) : (
              managerOverviews.map((mgr) => (
                <TouchableOpacity
                  key={mgr.$id}
                  style={styles.card}
                  onPress={() => router.push("/(stack)/admin-approvals")}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(mgr.fullName || mgr.email).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>
                        {mgr.fullName || mgr.email}
                      </Text>
                      <Text style={styles.meta}>{mgr.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        mgr.isApproved ? styles.badgeOk : styles.badgePending,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {mgr.isApproved ? "Aprovado" : "Pendente"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Ionicons name="map-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.meta}>
                      {mgr.routeNames.length
                        ? mgr.routeNames.join(" · ")
                        : "Sem rotas atribuídas"}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {mgr.customerCount} cliente(s) nas rotas atribuídas
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </SectionCard>
        ) : (
          <SectionCard
            title="Rotas"
            action={
              <PrimaryButton
                label="Gerenciar"
                variant="secondary"
                onPress={() => router.push("/(stack)/admin-routes")}
              />
            }
          >
            {routeOverviews.length === 0 ? (
              <Text style={fontStyles.bodyM}>Nenhuma rota cadastrada.</Text>
            ) : (
              routeOverviews.map((route) => {
                const expanded = expandedRouteId === route.$id;
                return (
                <View key={route.$id} style={styles.card}>
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedRouteId(expanded ? null : route.$id)
                    }
                  >
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, styles.routeAvatar]}>
                      <Ionicons name="map" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{route.name}</Text>
                      <Text style={styles.meta}>
                        {route.customerCount} cliente(s) · {route.managerCount}{" "}
                        manager(s)
                      </Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </View>
                  {route.managerNames.length > 0 ? (
                    <Text style={styles.meta}>
                      Managers: {route.managerNames.join(", ")}
                    </Text>
                  ) : (
                    <Text style={[styles.meta, styles.warn]}>
                      Nenhum manager atribuído a esta rota
                    </Text>
                  )}
                  </TouchableOpacity>
                  {expanded ? (
                    <View style={styles.clientList}>
                      {route.customers.length === 0 ? (
                        <Text style={styles.meta}>
                          Nenhum cliente nesta rota.
                        </Text>
                      ) : (
                        route.customers.map((c) => (
                          <View key={c.$id} style={styles.clientRow}>
                            <Text style={styles.clientName}>{c.fullName}</Text>
                            <Text style={styles.meta}>
                              {c.phone || "—"} ·{" "}
                              {c.active ? "Ativo" : "Inativo"}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  ) : null}
                </View>
              );
              })
            )}
          </SectionCard>
        )}
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  kpi: { flex: 1, minWidth: 130 },
  loader: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...fontStyles.bodyMBold, fontSize: 15 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  routeAvatar: { backgroundColor: colors.primaryLight },
  avatarText: { color: "#FFF", fontWeight: "700" },
  meta: { fontSize: 13, color: colors.textMuted },
  warn: { color: colors.warning },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOk: { backgroundColor: colors.successLight },
  badgePending: { backgroundColor: colors.warningLight },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
  clientList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  clientRow: {
    paddingVertical: spacing.xs,
    gap: 2,
  },
  clientName: { ...fontStyles.bodyMBold, fontSize: 14 },
});
