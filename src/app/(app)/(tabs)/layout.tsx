import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { GuestGateProvider } from "@/components/community/GuestGate";
import { unreadActivityCount } from "@/lib/community/activity";
import { isViewerAuthed } from "@/lib/viewer";

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const [communityBadge, isAuthed] = await Promise.all([unreadActivityCount(), isViewerAuthed()]);

  // El provider envuelve también a la tab bar: un invitado que toca Home,
  // Historial o Perfil tiene que ver el muro, no rebotar contra el middleware.
  return (
    <GuestGateProvider isAuthed={isAuthed}>
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[100px]">{children}</div>
        <BottomTabBar communityBadge={communityBadge} />
      </div>
    </GuestGateProvider>
  );
}
