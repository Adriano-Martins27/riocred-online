import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Customer } from "@/types/customer";
import { colors, radius, spacing } from "@/styles/theme";
import { fontStyles } from "@/styles/font";

type CustomerPickerProps = {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
};

export function CustomerPicker({
  customers,
  value,
  onChange,
}: CustomerPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.cpf.includes(q),
    );
  }, [customers, search]);

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="person-add-outline"
        title="Nenhum cliente"
        message="Cadastre um cliente antes de simular ou criar contrato."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Input
        label="Buscar cliente"
        value={search}
        onChangeText={setSearch}
        placeholder="Nome, telefone ou CPF"
      />
      {filtered.length === 0 ? (
        <Text style={styles.empty}>Nenhum cliente encontrado.</Text>
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => {
            const selected = value === item.$id;
            return (
              <TouchableOpacity
                key={item.$id}
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => onChange(item.$id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemBody}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  {item.phone ? (
                    <Text style={styles.meta}>{item.phone}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.primary}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={22}
                    color={colors.textLight}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  list: { gap: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  itemBody: { flex: 1, gap: 2 },
  name: { ...fontStyles.bodyMBold, fontSize: 14 },
  meta: { fontSize: 12, color: colors.textMuted },
  empty: { ...fontStyles.bodyM, color: colors.textMuted, paddingVertical: 8 },
});
