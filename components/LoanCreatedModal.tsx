import { Linking, Modal, StyleSheet, Text, View } from "react-native";
import type { Customer } from "@/types/customer";
import type { Loan } from "@/types/loan";
import type { UserSettings } from "@/types/settings";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  ModalScrollView,
  modalRootStyle,
} from "@/components/ui/ModalScrollView";
import { buildLoanWhatsAppMessage, whatsAppUrl } from "@/utils/whatsapp";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

type LoanCreatedModalProps = {
  visible: boolean;
  loan: Loan | null;
  customer: Customer | null;
  settings: UserSettings | null;
  onClose: () => void;
};

export function LoanCreatedModal({
  visible,
  loan,
  customer,
  settings,
  onClose,
}: LoanCreatedModalProps) {
  if (!loan) return null;

  const send = async (mode: "full" | "short") => {
    const phone = customer?.phone;
    if (!phone) return;
    const msg = buildLoanWhatsAppMessage(loan, settings, mode);
    await Linking.openURL(whatsAppUrl(phone, msg));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, modalRootStyle]}>
        <ModalScrollView contentContainerStyle={styles.overlayScroll}>
          <View style={styles.card}>
            <Text style={fontStyles.titleM}>Empréstimo criado</Text>
            <Text style={fontStyles.bodyM}>
              Contrato de {loan.customerName} registrado com sucesso.
            </Text>
            {customer?.phone ? (
              <>
                <PrimaryButton
                  label="WhatsApp — resumo completo"
                  onPress={() => send("full")}
                />
                <PrimaryButton
                  label="WhatsApp — resumo curto"
                  onPress={() => send("short")}
                  variant="secondary"
                />
              </>
            ) : (
              <Text style={fontStyles.bodyM}>
                Cliente sem telefone cadastrado para WhatsApp.
              </Text>
            )}
            <PrimaryButton label="Fechar" onPress={onClose} variant="ghost" />
          </View>
        </ModalScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: spacing.lg,
  },
  overlayScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    gap: 12,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
});
