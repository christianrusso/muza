import { TabScreenShell } from "@/components/navigation/TabScreenShell";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return <TabScreenShell>{children}</TabScreenShell>;
}
