import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ModalScrollView,
  modalRootStyle,
  modalShellStyle,
} from "@/components/ui/ModalScrollView";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import {
  useAdminMutations,
  useAllProfiles,
  useManagerRoutes,
  useRoutes,
} from "@/hooks/useAdmin";
import type { Profile } from "@/types/profile";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

function ManagerEditor({
  profile,
  visible,
  onClose,
}: {
  profile: Profile | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { data: routes } = useRoutes();
  const { data: assigned } = useManagerRoutes(profile?.$id);
  const { setAccess } = useAdminMutations();
  const [approved, setApproved] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  const [canEditCustomers, setCanEditCustomers] = useState(true);
  const [canDeleteCustomers, setCanDeleteCustomers] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setApproved(profile.isApproved);
    setRouteIds(assigned ?? []);
    setCanViewFinancials(profile.canViewFinancials);
    setCanEditCustomers(profile.canEditCustomers);
    setCanDeleteCustomers(profile.canDeleteCustomers);
  }, [profile, assigned]);

  const toggleRoute = (id: string) => {
    setRouteIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const save = async () => {
    if (!profile) return;
    await setAccess.mutateAsync({
      managerId: profile.$id,
      isApproved: approved,
      routeIds,
      canViewFinancials,
      canEditCustomers,
      canDeleteCustomers,
    });
    onClose();
  };

  if (!profile) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={modalRootStyle}>
        <SafeAreaView style={modalShellStyle}>
          <ModalScrollView contentContainerStyle={styles.modal}>
            <Text style={fontStyles.titleL}>
              {profile.fullName || profile.email}
            </Text>
            <Text style={fontStyles.bodyM}>{profile.email}</Text>

            <TouchableOpacity
              style={[styles.approveBtn, approved && styles.approveBtnOn]}
              onPress={() => setApproved((v) => !v)}
            >
              <Text style={fontStyles.bodyMBold}>
                {approved ? "✓ Aprovado" : "Pendente — toque para aprovar"}
              </Text>
            </TouchableOpacity>

            <Text style={fontStyles.titleM}>Rotas permitidas</Text>
            {(routes ?? []).length === 0 ? (
              <Text style={fontStyles.bodyM}>
                Nenhuma rota cadastrada. Crie em Admin → Rotas.
              </Text>
            ) : (
              routes?.map((r) => (
                <TouchableOpacity
                  key={r.$id}
                  style={[
                    styles.routeChip,
                    routeIds.includes(r.$id) && styles.routeChipOn,
                  ]}
                  onPress={() => toggleRoute(r.$id)}
                >
                  <Text style={fontStyles.bodyM}>{r.name}</Text>
                </TouchableOpacity>
              ))
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={fontStyles.bodyMBold}>
                  Ver capital na rua e totais
                </Text>
                <Text style={fontStyles.bodyM}>
                  Ative para funcionários por comissão. Desligue para salário —
                  não verão caixa, carteira nem totais no início.
                </Text>
              </View>
              <Switch
                value={canViewFinancials}
                onValueChange={setCanViewFinancials}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={fontStyles.bodyMBold}>Editar clientes</Text>
                <Text style={fontStyles.bodyM}>
                  Permite alterar cadastros existentes. Novos clientes nas rotas
                  permitidas continuam podendo ser criados.
                </Text>
              </View>
              <Switch
                value={canEditCustomers}
                onValueChange={setCanEditCustomers}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={fontStyles.bodyMBold}>Excluir clientes</Text>
                <Text style={fontStyles.bodyM}>
                  Libera o botão de exclusão na lista de clientes.
                </Text>
              </View>
              <Switch
                value={canDeleteCustomers}
                onValueChange={setCanDeleteCustomers}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <PrimaryButton
              label="Salvar"
              onPress={save}
              loading={setAccess.isPending}
            />
            <PrimaryButton
              label="Cancelar"
              onPress={onClose}
              variant="secondary"
            />
          </ModalScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default function AdminApprovalsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: profiles, isLoading } = useAllProfiles();
  const [editor, setEditor] = useState<Profile | null>(null);

  if (profile?.role !== "admin") {
    return (
      <ScreenShell title="Aprovações">
        <Text style={fontStyles.bodyM}>Acesso restrito a administradores.</Text>
        <PrimaryButton
          label="Voltar"
          onPress={() => router.back()}
          variant="ghost"
        />
      </ScreenShell>
    );
  }

  const managers = (profiles ?? []).filter((p) => p.role === "manager");
  const pendingCount = managers.filter((m) => !m.isApproved).length;
  const approvedCount = managers.filter((m) => m.isApproved).length;

  return (
    <>
      <ScreenShell
        title="Aprovações de managers"
        style={styles.shell}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScreenScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
          >
            <Text style={fontStyles.bodyM}>
              {pendingCount} pendente(s) · {approvedCount} aprovado(s)
            </Text>

            {managers.length === 0 ? (
              <Text style={fontStyles.bodyM}>Nenhum manager cadastrado.</Text>
            ) : (
              <View style={styles.list}>
                {managers.map((item) => (
                  <TouchableOpacity
                    key={item.$id}
                    style={styles.card}
                    onPress={() => setEditor(item)}
                  >
                    <Text style={styles.name}>
                      {item.fullName || item.email}
                    </Text>
                    <Text style={fontStyles.bodyM}>{item.email}</Text>
                    <Text style={fontStyles.caption}>
                      {[
                        item.canViewFinancials ? "Vê totais" : "Sem totais",
                        item.canEditCustomers ? "Edita clientes" : "Só leitura",
                        item.canDeleteCustomers ? "Pode excluir" : "Não exclui",
                      ].join(" · ")}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        item.isApproved ? styles.badgeOk : styles.badgePending,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.isApproved ? "Aprovado" : "Pendente"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScreenScrollView>
        )}
      </ScreenShell>

      <ManagerEditor
        profile={editor}
        visible={Boolean(editor)}
        onClose={() => setEditor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  list: { gap: 10 },
  loader: { marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: "600" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  modal: { padding: 20, gap: 12, paddingTop: 48 },
  approveBtn: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  approveBtnOn: {
    backgroundColor: colors.surfaceSuccess,
    borderColor: colors.primary,
  },
  routeChip: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeChipOn: {
    backgroundColor: colors.surfaceSuccess,
    borderColor: colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  switchText: { flex: 1, gap: 4 },
});
