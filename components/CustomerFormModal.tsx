import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ModalScrollView, modalRootStyle, modalShellStyle } from "@/components/ui/ModalScrollView";
import { AppwriteException } from "appwrite";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useRoutes } from "@/hooks/useAdmin";
import { useManagerScope } from "@/hooks/useManagerScope";
import type { BillingType, Customer, CustomerInput } from "@/types/customer";
import { emptyCustomerInput } from "@/types/customer";
import {
  fetchAddressByCep,
  maskCep,
  maskCpf,
  maskPhone,
} from "@/utils/masks";
import { createCustomerDocument } from "@/services/documents";
import { updateCustomer } from "@/services/customers";
import { uploadCustomerDocument, uploadCustomerPhoto } from "@/services/storage";
import type { DocumentType } from "@/types/document";
import { DOCUMENT_LABELS } from "@/types/document";
import { pickDocumentWeb, pickImageWeb } from "@/utils/file-picker";
import { fontStyles } from "@/styles/font";
import { colors } from "@/styles/theme";

const STEPS = ["Dados", "Comercial", "Endereço", "Documentos"] as const;
const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: "emprestimo", label: "Empréstimo" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "ambos", label: "Ambos" },
];

type CustomerFormModalProps = {
  visible: boolean;
  customer?: Customer | null;
  ownerId?: string;
  readOnly?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onSubmit: (input: CustomerInput) => Promise<Customer>;
  onDelete?: () => Promise<void>;
};

export function CustomerFormModal({
  visible,
  customer,
  ownerId,
  readOnly = false,
  canDelete = false,
  onClose,
  onSubmit,
  onDelete,
}: CustomerFormModalProps) {
  const { isAdmin, isManager, routes, canAssignRoute } = useManagerScope();
  const { data: allRoutes } = useRoutes();
  const routeChoices = isAdmin ? (allRoutes ?? []) : (routes ?? []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CustomerInput>(emptyCustomerInput());
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingDocs, setPendingDocs] = useState<
    { type: DocumentType; file: File; name: string }[]
  >([]);
  const [docType, setDocType] = useState<DocumentType>("rg");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    if (customer) {
      const { $id: _id, $createdAt: _c, ownerId: _o, clientRequestId: _r, ...rest } =
        customer;
      setForm(rest);
    } else {
      setForm(emptyCustomerInput());
    }
    setError(null);
    setPendingPhoto(null);
    setPendingDocs([]);
  }, [visible, customer]);

  const patch = (partial: Partial<CustomerInput>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const handleCepBlur = async () => {
    setLoadingCep(true);
    try {
      const data = await fetchAddressByCep(form.zipCode);
      if (data) {
        patch({
          street: data.logradouro ?? form.street,
          neighborhood: data.bairro ?? form.neighborhood,
          city: data.localidade ?? form.city,
          state: data.uf ?? form.state,
        });
      }
    } finally {
      setLoadingCep(false);
    }
  };

  const next = () => {
    if (step === 0 && !form.fullName.trim()) {
      setError("Nome completo é obrigatório.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSave = async () => {
    if (readOnly) return;
    if (!form.fullName.trim()) {
      setError("Nome completo é obrigatório.");
      setStep(0);
      return;
    }
    if (isManager) {
      if (!form.routeId) {
        setError("Selecione uma rota atribuída ao seu perfil.");
        setStep(1);
        return;
      }
      if (!canAssignRoute(form.routeId)) {
        setError("Você não pode atribuir clientes a esta rota.");
        setStep(1);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      let input = { ...form };
      const saved = await onSubmit(input);

      if (pendingPhoto && ownerId) {
        const fileId = await uploadCustomerPhoto(
          ownerId,
          saved.$id,
          pendingPhoto,
          pendingPhoto.name,
        );
        await updateCustomer(saved.$id, ownerId, {
          ...input,
          photoFileId: fileId,
          photoUpdatedAt: new Date().toISOString(),
        });
      }

      if (ownerId) {
        for (const doc of pendingDocs) {
          const fileId = await uploadCustomerDocument(
            ownerId,
            doc.file,
            doc.name,
          );
          await createCustomerDocument(
            ownerId,
            saved.$id,
            doc.type,
            fileId,
            doc.name,
          );
        }
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof AppwriteException
          ? err.message
          : "Não foi possível salvar o cliente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={modalRootStyle}>
      <View style={styles.container}>
        <ModalScrollView contentContainerStyle={styles.scroll}>
          <Text style={fontStyles.titleL}>
            {readOnly
              ? "Ver cliente"
              : customer
                ? "Editar cliente"
                : "Novo cliente"}
          </Text>
          {readOnly ? (
            <Text style={fontStyles.bodyM}>
              Você pode visualizar, mas não editar este cadastro.
            </Text>
          ) : null}

          <View style={styles.steps}>
            {STEPS.map((label, i) => (
              <View
                key={label}
                style={[styles.stepDot, i <= step && styles.stepDotActive]}
              >
                <Text style={[styles.stepText, i <= step && styles.stepTextActive]}>
                  {i + 1}. {label}
                </Text>
              </View>
            ))}
          </View>

          {step === 0 ? (
            <>
              <Input
                label="Nome completo *"
                value={form.fullName}
                onChangeText={(fullName) => patch({ fullName })}
                editable={!readOnly}
              />
              <Input
                label="CPF"
                value={form.cpf}
                onChangeText={(cpf) => patch({ cpf: maskCpf(cpf) })}
                keyboardType="numeric"
                editable={!readOnly}
              />
              <Input
                label="Telefone / WhatsApp"
                value={form.phone}
                onChangeText={(phone) => patch({ phone: maskPhone(phone) })}
                keyboardType="phone-pad"
                editable={!readOnly}
              />
              <Input
                label="Tipo de cliente"
                value={form.clientType}
                onChangeText={(clientType) => patch({ clientType })}
                editable={!readOnly}
              />
              <View style={styles.switchRow}>
                <Text style={fontStyles.bodyM}>Cliente ativo</Text>
                <Switch
                  value={form.active}
                  onValueChange={(active) => patch({ active })}
                  trackColor={{ true: colors.primary }}
                  disabled={readOnly}
                />
              </View>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.section}>Tipo de cobrança</Text>
              <View style={styles.chips}>
                {BILLING_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      form.billingType === opt.value && styles.chipOn,
                    ]}
                    onPress={() => patch({ billingType: opt.value })}
                  >
                    <Text style={fontStyles.bodyM}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input
                label="Indicador — nome"
                value={form.referrerName}
                onChangeText={(referrerName) => patch({ referrerName })}
              />
              <Input
                label="Indicador — telefone"
                value={form.referrerPhone}
                onChangeText={(referrerPhone) =>
                  patch({ referrerPhone: maskPhone(referrerPhone) })
                }
                keyboardType="phone-pad"
              />
              <Text style={styles.section}>Rota</Text>
              {isAdmin ? (
                <Text style={fontStyles.caption}>
                  Como administrador, cadastre o cliente em qualquer rota da
                  operação.
                </Text>
              ) : null}
              {routeChoices.length === 0 ? (
                <Text style={fontStyles.bodyM}>
                  {isManager
                    ? "Nenhuma rota atribuída. Peça ao administrador."
                    : "Nenhuma rota cadastrada (admin pode criar em Mais → Rotas)."}
                </Text>
              ) : (
                <View style={styles.chips}>
                  {!isManager ? (
                    <TouchableOpacity
                      style={[styles.chip, !form.routeId && styles.chipOn]}
                      onPress={() => patch({ routeId: "" })}
                    >
                      <Text style={fontStyles.bodyM}>Sem rota</Text>
                    </TouchableOpacity>
                  ) : null}
                  {routeChoices.map((r) => (
                    <TouchableOpacity
                      key={r.$id}
                      style={[
                        styles.chip,
                        form.routeId === r.$id && styles.chipOn,
                      ]}
                      onPress={() => !readOnly && patch({ routeId: r.$id })}
                      disabled={readOnly}
                    >
                      <Text style={fontStyles.bodyM}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Input
                label="Referência / observações"
                value={form.reference}
                onChangeText={(reference) => patch({ reference })}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Input
                label="CEP"
                value={form.zipCode}
                onChangeText={(zipCode) => patch({ zipCode: maskCep(zipCode) })}
                onBlur={handleCepBlur}
                keyboardType="numeric"
              />
              {loadingCep ? (
                <Text style={styles.hint}>Buscando CEP…</Text>
              ) : null}
              <Input
                label="Rua"
                value={form.street}
                onChangeText={(street) => patch({ street })}
              />
              <Input
                label="Número"
                value={form.number}
                onChangeText={(number) => patch({ number })}
              />
              <Input
                label="Complemento"
                value={form.complement}
                onChangeText={(complement) => patch({ complement })}
              />
              <Input
                label="Bairro"
                value={form.neighborhood}
                onChangeText={(neighborhood) => patch({ neighborhood })}
              />
              <Input
                label="Cidade"
                value={form.city}
                onChangeText={(city) => patch({ city })}
              />
              <Input
                label="UF"
                value={form.state}
                onChangeText={(state) =>
                  patch({ state: state.toUpperCase().slice(0, 2) })
                }
                autoCapitalize="characters"
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={styles.section}>Foto do cliente</Text>
              {form.photoFileId ? (
                <Text style={fontStyles.bodyM}>
                  Foto salva (ID: {form.photoFileId.slice(0, 8)}…)
                </Text>
              ) : null}
              {pendingPhoto ? (
                <Text style={fontStyles.bodyM}>Nova foto: {pendingPhoto.name}</Text>
              ) : null}
              <PrimaryButton
                label="Selecionar foto"
                variant="secondary"
                onPress={async () => {
                  const file = await pickImageWeb();
                  if (file) setPendingPhoto(file);
                }}
              />

              <Text style={styles.section}>Documentos</Text>
              <View style={styles.chips}>
                {(Object.keys(DOCUMENT_LABELS) as DocumentType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, docType === t && styles.chipOn]}
                    onPress={() => setDocType(t)}
                  >
                    <Text style={fontStyles.bodyM}>{DOCUMENT_LABELS[t]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <PrimaryButton
                label="Anexar documento"
                variant="secondary"
                onPress={async () => {
                  const file = await pickDocumentWeb();
                  if (file) {
                    setPendingDocs((prev) => [
                      ...prev,
                      { type: docType, file, name: file.name },
                    ]);
                  }
                }}
              />
              {pendingDocs.map((d, i) => (
                <Text key={`${d.name}-${i}`} style={fontStyles.bodyM}>
                  {DOCUMENT_LABELS[d.type]}: {d.name}
                </Text>
              ))}
              {!customer && pendingDocs.length > 0 ? (
                <Text style={styles.hint}>
                  Documentos serão enviados após salvar o cliente.
                </Text>
              ) : null}
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            {readOnly ? (
              <PrimaryButton label="Fechar" onPress={onClose} />
            ) : (
              <>
                {step > 0 ? (
                  <PrimaryButton label="Voltar" onPress={back} variant="secondary" />
                ) : (
                  <PrimaryButton label="Cancelar" onPress={onClose} variant="secondary" />
                )}
                {step < STEPS.length - 1 ? (
                  <PrimaryButton label="Próximo" onPress={next} />
                ) : (
                  <PrimaryButton label="Salvar" onPress={handleSave} loading={loading} />
                )}
              </>
            )}
            {customer && canDelete && onDelete ? (
              <PrimaryButton
                label="Excluir cliente"
                variant="ghost"
                loading={deleting}
                onPress={async () => {
                  const { confirmAction } = await import("@/utils/confirm");
                  const ok = await confirmAction(
                    "Excluir cliente",
                    `Remover ${customer.fullName} e todos os empréstimos vinculados? Esta ação não pode ser desfeita.`,
                  );
                  if (!ok) return;
                  setDeleting(true);
                  try {
                    await onDelete();
                    onClose();
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Não foi possível excluir o cliente.",
                    );
                  } finally {
                    setDeleting(false);
                  }
                }}
              />
            ) : null}
          </View>
        </ModalScrollView>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...modalShellStyle,
    backgroundColor: colors.background,
    paddingTop: 48,
  },
  scroll: {
    padding: 20,
    gap: 12,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  steps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  stepDot: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.surfaceSuccess,
  },
  stepText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  stepTextActive: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
  section: {
    ...fontStyles.titleM,
    marginTop: 4,
    fontSize: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSuccess,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textLight,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
