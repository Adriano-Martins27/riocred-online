import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/ui/StatCard";
import { useSettings, useSettingsMutations } from "@/hooks/useSettings";
import { emptySettings } from "@/types/settings";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useRemindersEnabled } from "@/hooks/useLocalReminders";
import { assertOnline } from "@/utils/online";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

export default function SettingsScreen() {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { saveSettings, saveName } = useSettingsMutations();
  const online = useOnlineStatus();
  const reminders = useRemindersEnabled();
  const [form, setForm] = useState(emptySettings());
  const [fullName, setFullName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
    if (user?.name) setFullName(user.name);
  }, [settings, user]);

  const handleSave = async () => {
    assertOnline(online);
    await saveSettings.mutateAsync(form);
    if (fullName.trim() && fullName !== user?.name) {
      await saveName.mutateAsync(fullName.trim());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScreenShell title="Configurações" subtitle="Perfil e preferências">
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <SectionCard title="Perfil">
          <Input
            label="Nome completo"
            value={fullName}
            onChangeText={setFullName}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChangeText={(whatsapp) => setForm({ ...form, whatsapp })}
            keyboardType="phone-pad"
          />
        </SectionCard>

        <SectionCard title="Empresa">
          <Input
            label="Nome da empresa"
            value={form.companyName}
            onChangeText={(companyName) => setForm({ ...form, companyName })}
          />
          <Input
            label="Chave PIX"
            value={form.pixKey}
            onChangeText={(pixKey) => setForm({ ...form, pixKey })}
          />
        </SectionCard>

        <SectionCard title="Templates WhatsApp">
          <Input
            label="Cobrança padrão"
            value={form.templateDefault}
            onChangeText={(templateDefault) =>
              setForm({ ...form, templateDefault })
            }
          />
          <Input
            label="Vence hoje"
            value={form.templateDueToday}
            onChangeText={(templateDueToday) =>
              setForm({ ...form, templateDueToday })
            }
          />
          <Input
            label="Em atraso"
            value={form.templateOverdue}
            onChangeText={(templateOverdue) =>
              setForm({ ...form, templateOverdue })
            }
          />
        </SectionCard>

        <SectionCard title="Preferências">
          <View style={styles.switchRow}>
            <Text style={fontStyles.bodyM}>WhatsApp habilitado</Text>
            <Switch
              value={form.whatsappEnabled}
              onValueChange={(whatsappEnabled) =>
                setForm({ ...form, whatsappEnabled })
              }
              trackColor={{ true: colors.primary }}
            />
          </View>
        </SectionCard>

        {reminders.supported ? (
          <SectionCard title="Notificações">
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={fontStyles.bodyM}>Lembretes de cobrança</Text>
                <Text style={styles.hint}>
                  Todo dia às 8h: parcelas que vencem e em atraso
                </Text>
              </View>
              <Switch
                value={reminders.enabled}
                onValueChange={(enabled) =>
                  reminders.toggle.mutate(enabled)
                }
                disabled={reminders.toggle.isPending}
                trackColor={{ true: colors.primary }}
              />
            </View>
            {reminders.toggle.data?.permission === false ? (
              <Text style={styles.warning}>
                Permissão negada. Libere as notificações do RioCred nas
                configurações do Android.
              </Text>
            ) : null}
          </SectionCard>
        ) : null}

        {saved ? (
          <Text style={styles.success}>Configurações salvas.</Text>
        ) : null}

        <PrimaryButton
          label="Salvar"
          onPress={handleSave}
          loading={saveSettings.isPending}
        />
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  switchLabel: { flex: 1, gap: 2 },
  hint: { ...fontStyles.bodyM, fontSize: 12, color: colors.textMuted },
  warning: { color: colors.danger, fontSize: 13 },
  success: { color: colors.success, textAlign: "center" },
});
