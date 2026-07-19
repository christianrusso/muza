import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export function DailyChallengeCompleteSheet({ streak, onDismiss }: { streak: number; onDismiss: () => void }) {
  return (
    <ModalPortal>
      <div className="sheet-backdrop" onClick={onDismiss} />
      <BottomSheet className="challenge-sheet">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="streak-flame">
            <MaterialIcon name="local_fire_department" size={54} filled />
          </span>
          <span className="font-serif text-[26px]">¡Reto de hoy completo!</span>
          <span className="text-sm font-semibold text-muted">
            Llevás <strong className="text-ink">{streak}</strong>{" "}
            {streak === 1 ? "día seguido opinando" : "días seguidos opinando"}
          </span>
          <Button variant="primary" className="mt-2 w-full" onClick={onDismiss}>
            Listo
          </Button>
        </div>
      </BottomSheet>
    </ModalPortal>
  );
}
