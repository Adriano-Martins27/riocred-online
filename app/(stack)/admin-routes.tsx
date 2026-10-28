import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { SectionCard } from "@/components/ui/StatCard";
import { useAdminMutations, useRoutes } from "@/hooks/useAdmin";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

export default function AdminRoutesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { data: routes, isLoading } = useRoutes();
  const { createRouteMut, deleteRouteMut, updateRouteMut } = useAdminMutations();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (profile?.role !== "admin") {
    return (
      <ScreenShell title="Rotas">
        <Text style={fontStyles.bodyM}>Acesso restrito a administradores.</Text>
        <PrimaryButton label="Voltar" onPress={() => router.back()} variant="ghost" />
      </ScreenShell>
    );
  }

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    await createRouteMut.mutateAsync({ createdBy: user.$id, name: trimmed });
    setName("");
  };

  return (
    <ScreenShell title="Rotas" subtitle="Organize clientes por região">
      <ScreenScrollView contentContainerStyle={styles.page}>
        <SectionCard title="Nova rota">
          <Input label="Nome da rota" value={name} onChangeText={setName} />
          <PrimaryButton
            label="Adicionar"
            onPress={add}
            loading={createRouteMut.isPending}
          />
        </SectionCard>

        <SectionCard title="Rotas cadastradas">
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (routes ?? []).length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="Nenhuma rota cadastrada"
              message="Crie rotas para agrupar clientes por região."
            />
          ) : (
            <View style={styles.list}>
              {(routes ?? []).map((item) => (
                <View key={item.$id} style={styles.card}>
                  {editingId === item.$id ? (
                    <>
                      <Input
                        label="Nome"
                        value={editName}
                        onChangeText={setEditName}
                      />
                      <PrimaryButton
                        label="Salvar"
                        onPress={async () => {
                          await updateRouteMut.mutateAsync({
                            id: item.$id,
                            name: editName,
                          });
                          setEditingId(null);
                        }}
                      />
                    </>
                  ) : (
                    <Text style={styles.routeName}>{item.name}</Text>
                  )}
                  <View style={styles.actions}>
                    <PrimaryButton
                      label="Editar"
                      variant="secondary"
                      onPress={() => {
                        setEditingId(item.$id);
                        setEditName(item.name);
                      }}
                    />
                    <PrimaryButton
                      label="Excluir"
                      variant="ghost"
                      onPress={() => deleteRouteMut.mutate(item.$id)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </ScreenScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadow.sm,
  },
  routeName: { ...fontStyles.bodyMBold, fontSize: 16 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
