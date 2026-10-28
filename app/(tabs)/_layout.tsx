import { Tabs } from "expo-router";
import { useIsDesktop } from "@/hooks/useBreakpoint";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { colors } from "@/styles/theme";

export default function TabsLayout() {
  const isDesktop = useIsDesktop();

  return (
    <Tabs
      tabBar={isDesktop ? () => null : (props) => <MobileTabBar {...props} />}
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        sceneStyle: {
          backgroundColor: colors.background,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início" }} />
      <Tabs.Screen name="customers" options={{ title: "Clientes" }} />
      <Tabs.Screen name="loans" options={{ title: "Empréstimos" }} />
      <Tabs.Screen name="calendar" options={{ title: "Agenda" }} />
      <Tabs.Screen name="more" options={{ title: "Mais" }} />
    </Tabs>
  );
}
