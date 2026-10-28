import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { SectionCard } from "@/components/ui/StatCard";
import { useAppSettings, useAppSettingsMutations } from "@/hooks/useAppSettings";
import { emptyAppSettings } from "@/types/app-settings";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: settings } = useAppSettings();
  const { save } = useAppSettingsMutations();
  const [form, setForm] = useState(emptyAppSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      const { $id: _id, ...rest } = settings;
      setForm(rest);
    }
  }, [settings]);

  if (profile?.role !== "admin") {
    return (
      <ScreenShell title="Notificações">
        <Text style={fontStyles.bodyM}>Acesso restrito a administradores.</Text>
        <PrimaryButton label="Voltar" onPress={() => router.back()} variant="ghost" />
      </ScreenShell>
    );
  }

  const handleSave = async () => {
    await save.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScreenShell
      title="Notificações admin"
      subtitle="Integrações e mensagens automáticas"
    >
      <ScreenScrollView contentContainerStyle={styles.scroll}>
        <SectionCard title="Evolution API (global)">
          <Text style={fontStyles.bodyM}>
            Credenciais usadas por Appwrite Functions. Não exponha no client em
            produção — migre para secrets server-side.
          </Text>
          <Input
            label="Base URL"
            value={form.evolutionBaseUrl}
            onChangeText={(evolutionBaseUrl) =>
              setForm({ ...form, evolutionBaseUrl })
            }
          />
          <Input
            label="API Key"
            value={form.evolutionApiKey}
            onChangeText={(evolutionApiKey) =>
              setForm({ ...form, evolutionApiKey })
            }
            secureTextEntry
          />
          <Input
            label="Instance name"
            value={form.evolutionInstanceName}
            onChangeText={(evolutionInstanceName) =>
              setForm({ ...form, evolutionInstanceName })
            }
          />
        </SectionCard>

        <SectionCard title="Templates automáticos">
          <Input
            label="Empréstimo criado"
            value={form.templateLoanCreated}
            onChangeText={(templateLoanCreated) =>
              setForm({ ...form, templateLoanCreated })
            }
          />
          <Input
            label="Vence em breve"
            value={form.templateDueSoon}
            onChangeText={(templateDueSoon) =>
              setForm({ ...form, templateDueSoon })
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

        <SectionCard title="Push notifications">
          <Text style={fontStyles.bodyM}>
            {Platform.OS === "web"
              ? "Push remoto indisponível no navegador. Use o app Android/iOS (development build) para notificações."
              : "Registro de token Expo será habilitado no build nativo."}
          </Text>
        </SectionCard>

        {saved ? <Text style={styles.success}>Configurações salvas.</Text> : null}
        <PrimaryButton label="Salvar" onPress={handleSave} loading={save.isPending} />
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  success: { color: colors.success, textAlign: "center" },
});
