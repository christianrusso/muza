import { loadBlockedUsers } from "@/lib/community/blocks";
import { ScreenHead } from "@/components/navigation/TopBar";
import { BlockedUsersList } from "@/components/settings/BlockedUsersList";

export default async function BlockedUsersPage() {
  const users = await loadBlockedUsers();
  return (
    <div className="screen-body pad">
      <ScreenHead title="Usuarios bloqueados" backHref="/profile/settings" />
      <BlockedUsersList initialUsers={users} />
    </div>
  );
}
