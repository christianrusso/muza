import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { unreadActivityCount } from "@/lib/community/activity";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const communityBadge = await unreadActivityCount();
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-[100px]">{children}</div>
      <BottomTabBar communityBadge={communityBadge} />
    </div>
  );
}
