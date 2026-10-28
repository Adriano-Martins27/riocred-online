import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

export default function SyncStatusScreen() {
  const { syncing, lastSync, queueSummary, sync, online } = useOfflineSync();

  const handleSync = async () => {
    try {
      const result = await sync();
      console.log('Sync result:', result);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  return (
    <ScreenShell title="Sincronização">
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.badge, online ? styles.online : styles.offline]}>
          <Text style={fontStyles.bodyMBold}>
            {online ? "Online" : "Offline"}
          </Text>
        </View>

        <Text style={fontStyles.bodyM}>
          Última sync:{" "}
          {lastSync
            ? new Date(lastSync).toLocaleString("pt-BR")
            : "Nunca"}
        </Text>

        <View style={styles.summaryRow}>
          <Text style={fontStyles.bodyM}>
            Pendentes: <Text style={fontStyles.bodyMBold}>{queueSummary.pending}</Text>
          </Text>
          <Text style={fontStyles.bodyM}>
            Erros: <Text style={[fontStyles.bodyMBold, queueSummary.error > 0 && styles.errorText]}>{queueSummary.error}</Text>
          </Text>
          <Text style={fontStyles.bodyM}>
            Sincronizados: <Text style={fontStyles.bodyMBold}>{queueSummary.synced}</Text>
          </Text>
        </View>

        <PrimaryButton
          label="Sincronizar agora"
          onPress={handleSync}
          loading={syncing}
          disabled={!online}
        />

        {queueSummary.pending === 0 && queueSummary.error === 0 ? (
          <Text style={fontStyles.bodyM}>Tudo sincronizado.</Text>
        ) : null}

        <Text style={styles.note}>
          Sistema offline com SQLite ativado. Leituras sempre do banco local.
          Escritas são enfileiradas e sincronizadas automaticamente quando voltar online.
        </Text>
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  online: { backgroundColor: "#DCFCE7" },
  offline: { backgroundColor: "#FEE2E2" },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  errorText: { color: colors.danger },
  note: {
    ...fontStyles.bodyM,
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.lg,
  },
});
