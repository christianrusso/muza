import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { GuestGateProvider } from "@/components/community/GuestGate";
import { unreadActivityCount } from "@/lib/community/activity";
import { isViewerAuthed } from "@/lib/viewer";

// El detalle de un post vive fuera del grupo (tabs), así que no heredaba la tab
// bar y la pantalla quedaba sin navegación inferior. Reproducimos el mismo shell
// que (tabs)/layout: área scrolleable + BottomTabBar fija abajo. El
// GuestGateProvider tiene que envolver también a la tab bar (usa useGuestGate).
export default async function PostDetailLayout({ children }: { children: React.ReactNode }) {
  const [communityBadge, isAuthed] = await Promise.all([unreadActivityCount(), isViewerAuthed()]);

  return (
    <GuestGateProvider isAuthed={isAuthed}>
      <div className="relative flex h-dvh flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[100px]">{children}</div>
        <BottomTabBar communityBadge={communityBadge} />
      </div>
    </GuestGateProvider>
  );
}
