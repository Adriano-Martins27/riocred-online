import { Input } from "@/components/Input";
import { maskBRLInput } from "@/utils/currency";
import type { TextInputProps } from "react-native";

type CurrencyInputProps = Omit<TextInputProps, "onChangeText" | "value"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function CurrencyInput({
  value,
  onChangeText,
  ...props
}: CurrencyInputProps) {
  return (
    <Input
      {...props}
      value={value}
      onChangeText={(text) => onChangeText(maskBRLInput(text))}
      keyboardType="numeric"
      placeholder={props.placeholder ?? "0,00"}
    />
  );
}
