import { Switch } from "@/components/ui/switch";
import { LabeledRange } from "./LabeledRange";
import { useStudioStore } from "../model/useStudioStore";
import type { StudioDocumentSettings } from "../stitch/buildPlan";

/** Document-wide tatami fill + running-stitch defaults. */
export function StudioSettings({
  settings,
}: {
  settings: StudioDocumentSettings;
}) {
  const updateTatami = useStudioStore((s) => s.updateTatami);
  const updateRunning = useStudioStore((s) => s.updateRunning);
  const { tatami, running } = settings;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Tatami fill
        </h4>
        <LabeledRange
          label="Row spacing (density)"
          value={tatami.rowSpacing}
          min={0.25}
          max={1}
          step={0.05}
          unit="mm"
          onChange={(rowSpacing) => updateTatami({ rowSpacing })}
        />
        <LabeledRange
          label="Max stitch length"
          value={tatami.maxStitchLen}
          min={1.5}
          max={5}
          step={0.5}
          unit="mm"
          onChange={(maxStitchLen) => updateTatami({ maxStitchLen })}
        />
        <LabeledRange
          label="Angle"
          value={tatami.angle}
          min={0}
          max={180}
          step={5}
          unit="°"
          onChange={(angle) => updateTatami({ angle })}
        />
        <label className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          Underlay
          <Switch
            checked={tatami.underlay}
            onCheckedChange={(underlay) => updateTatami({ underlay })}
          />
        </label>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Running stitch (outline)
        </h4>
        <LabeledRange
          label="Stitch length"
          value={running.stitchLen}
          min={1}
          max={4}
          step={0.5}
          unit="mm"
          onChange={(stitchLen) => updateRunning({ stitchLen })}
        />
        <label className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          Triple stitch
          <Switch
            checked={running.triple}
            onCheckedChange={(triple) => updateRunning({ triple })}
          />
        </label>
      </div>
    </div>
  );
}
