import { BottomTabBar } from "@/components/navigation/BottomTabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-[100px]">{children}</div>
      <BottomTabBar />
    </div>
  );
}
