import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        },
      }}
    >
      <Stack.Screen name="settings" options={{ title: "Configurações" }} />
      <Stack.Screen name="loan-simulator" options={{ title: "Simulador" }} />
      <Stack.Screen name="customer-scores" options={{ title: "Score de Clientes" }} />
      <Stack.Screen name="loans-report" options={{ title: "Relatórios" }} />
      <Stack.Screen name="caixa" options={{ title: "Caixa" }} />
      <Stack.Screen name="overdue" options={{ title: "Vencidos" }} />
      <Stack.Screen name="payables" options={{ title: "Contas a pagar" }} />
      <Stack.Screen name="sync-status" options={{ title: "Sincronização" }} />
      <Stack.Screen name="team-overview" options={{ title: "Equipe & Rotas" }} />
      <Stack.Screen
        name="admin-approvals"
        options={{ title: "Aprovações" }}
      />
      <Stack.Screen name="admin-routes" options={{ title: "Rotas" }} />
      <Stack.Screen
        name="admin-notifications"
        options={{ title: "Notificações" }}
      />
    </Stack>
  );
}
