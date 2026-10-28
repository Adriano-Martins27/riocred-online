import { StyleSheet } from "react-native";
import { colors } from "@/styles/theme";

const sans = "PlusJakartaSans_400Regular";
const sansMedium = "PlusJakartaSans_500Medium";
const sansSemi = "PlusJakartaSans_600SemiBold";
const sansBold = "PlusJakartaSans_700Bold";

export const fontStyles = StyleSheet.create({
  display: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
    fontFamily: sansBold,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  titleL: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    fontFamily: sansBold,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  titleM: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    fontFamily: sansSemi,
    fontWeight: "600",
  },
  titleS: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: sansSemi,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bodyL: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontFamily: sans,
  },
  bodyM: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    fontFamily: sans,
  },
  bodyMBold: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: sansSemi,
    fontWeight: "600",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textLight,
    fontFamily: sansMedium,
    fontWeight: "500",
  },
  metric: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    fontFamily: sansBold,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
});

export const fonts = {
  regular: sans,
  medium: sansMedium,
  semiBold: sansSemi,
  bold: sansBold,
};
