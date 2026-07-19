import { ScreenHead } from "@/components/navigation/TopBar";
import { ColorimetryPhotoPicker } from "@/components/colorimetry/ColorimetryPhotoPicker";

export default function NewColorimetryPage() {
  return (
    <div className="screen-body pad">
      <ScreenHead title="Subí tu foto" backHref="/colorimetry" />
      <ColorimetryPhotoPicker />
    </div>
  );
}
