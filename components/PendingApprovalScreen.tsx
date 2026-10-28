import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenScrollView } from "@/components/ui/ScreenScrollView";
import { fontStyles } from "@/styles/font";
import { colors, spacing } from "@/styles/theme";

const logo = require("@/assets/logo.png");

type PendingApprovalScreenProps = {
  onSignOut: () => void;
};

export function PendingApprovalScreen({ onSignOut }: PendingApprovalScreenProps) {
  return (
    <ScreenScrollView
      alwaysScroll
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <Image source={logo} style={styles.logo} contentFit="contain" />
      <Text style={fontStyles.titleL}>Aguardando aprovação</Text>
      <Text style={[fontStyles.bodyM, styles.text]}>
        Sua conta de operador foi criada, mas ainda precisa ser aprovada por um
        administrador antes de acessar o RioCred.
      </Text>
      <PrimaryButton label="Sair da conta" onPress={onSignOut} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    paddingBottom: spacing.xxl,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: spacing.sm,
  },
  text: { lineHeight: 22, textAlign: "center" },
});
