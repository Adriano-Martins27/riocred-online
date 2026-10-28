import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenShell } from "@/components/ScreenShell";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormSheet } from "@/components/ui/FormSheet";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { SectionCard } from "@/components/ui/StatCard";
import { usePayableMutations, usePayables } from "@/hooks/usePayables";
import type { Payable, PayableInput } from "@/types/payable";
import { emptyPayable } from "@/types/payable";
import { formatBRL, maskBRLInput, parseBRLInput } from "@/utils/currency";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { assertOnline } from "@/utils/online";
import { fontStyles } from "@/styles/font";
import { colors, radius, shadow, spacing } from "@/styles/theme";

export default function PayablesScreen() {
  const { data, isLoading } = usePayables();
  const { create, update, remove } = usePayableMutations();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Payable | null>(null);
  const [form, setForm] = useState<PayableInput>(emptyPayable());
  const [amountStr, setAmountStr] = useState("");

  const openNew = () => {
    setSelected(null);
    setForm(emptyPayable());
    setAmountStr("");
    setOpen(true);
  };

  const openEdit = (p: Payable) => {
    setSelected(p);
    setForm({
      name: p.name,
      amount: p.amount,
      dueDate: p.dueDate,
      category: p.category,
      notes: p.notes,
      status: p.status,
    });
    setAmountStr(
      p.amount > 0
        ? maskBRLInput(String(Math.round(p.amount * 100)))
        : "",
    );
    setOpen(true);
  };

  const save = async () => {
    assertOnline(online);
    const amount = parseBRLInput(amountStr);
    const input = { ...form, amount };
    if (selected) {
      await update.mutateAsync({ id: selected.$id, input });
    } else {
      await create.mutateAsync(input);
    }
    setOpen(false);
  };

  const items = data ?? [];

  return (
    <>
      <ScreenShell
        title="Contas a pagar"
        subtitle="Despesas e compromissos da operação"
        style={styles.shell}
        headerRight={<PrimaryButton label="+ Nova" onPress={openNew} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScreenScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
          >
            {items.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Nenhuma conta cadastrada"
                message="Adicione despesas para acompanhar vencimentos."
              />
            ) : (
              <View style={styles.list}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.$id}
                    style={styles.card}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text
                        style={[
                          styles.badge,
                          item.status === "paid"
                            ? styles.badgePaid
                            : styles.badgePending,
                        ]}
                      >
                        {item.status === "paid" ? "Pago" : "Pendente"}
                      </Text>
                    </View>
                    <Text style={fontStyles.bodyM}>
                      {formatBRL(item.amount)} ·{" "}
                      {item.dueDate.split("-").reverse().join("/")}
                    </Text>
                    {item.category ? (
                      <Text style={styles.meta}>{item.category}</Text>
                    ) : null}
                    {item.status === "pending" ? (
                      <View style={styles.actions}>
                        <PrimaryButton
                          label="Marcar pago"
                          variant="secondary"
                          onPress={() => {
                            const input: PayableInput = {
                              name: item.name,
                              amount: item.amount,
                              dueDate: item.dueDate,
                              category: item.category,
                              notes: item.notes,
                              status: "paid",
                            };
                            update.mutate({ id: item.$id, input });
                          }}
                        />
                        <PrimaryButton
                          label="Excluir"
                          variant="ghost"
                          onPress={() => remove.mutate(item.$id)}
                        />
                      </View>
                    ) : (
                      <PrimaryButton
                        label="Excluir"
                        variant="ghost"
                        onPress={() => remove.mutate(item.$id)}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScreenScrollView>
        )}
      </ScreenShell>

      <FormSheet
        visible={open}
        title={selected ? "Editar conta" : "Nova conta"}
        subtitle="Preencha os dados da despesa"
        onClose={() => setOpen(false)}
        footer={
          <>
            <PrimaryButton label="Salvar" onPress={save} />
            <PrimaryButton
              label="Cancelar"
              variant="secondary"
              onPress={() => setOpen(false)}
            />
          </>
        }
      >
        <SectionCard title="Dados">
          <Input
            label="Nome"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <CurrencyInput
            label="Valor"
            value={amountStr}
            onChangeText={setAmountStr}
          />
          <DatePickerField
            label="Vencimento"
            value={form.dueDate}
            onChange={(dueDate) => setForm({ ...form, dueDate })}
          />
        </SectionCard>
        <SectionCard title="Opcional">
          <Input
            label="Categoria"
            value={form.category}
            onChangeText={(category) => setForm({ ...form, category })}
          />
          <Input
            label="Observações"
            value={form.notes}
            onChangeText={(notes) => setForm({ ...form, notes })}
            multiline
          />
        </SectionCard>
      </FormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, paddingBottom: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: { gap: spacing.sm, paddingBottom: spacing.xxl },
  list: { gap: spacing.sm },
  loader: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: { ...fontStyles.bodyMBold, fontSize: 16, flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  badgePending: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },
  badgePaid: {
    backgroundColor: "#DCFCE7",
    color: colors.success,
  },
  meta: { ...fontStyles.caption, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
