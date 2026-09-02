import { Switch } from "@/components/ui/switch";
import type { StudioShape } from "../stitch/types";
import { useStudioStore } from "../model/useStudioStore";

/** Per-shape controls: colour, fill on/off, outline on/off. */
export function StudioShapeList({ shapes }: { shapes: StudioShape[] }) {
  const updateShape = useStudioStore((s) => s.updateShape);

  if (shapes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Shapes ({shapes.length})
      </h4>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {shapes.map((shape) => (
          <li
            key={shape.id}
            className="flex items-center gap-2 rounded bg-gray-100 dark:bg-gray-800 px-2 py-1.5"
          >
            <input
              type="color"
              aria-label={`Colour for ${shape.name}`}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border border-gray-300 dark:border-gray-600 bg-transparent"
              value={shape.color}
              onChange={(e) => updateShape(shape.id, { color: e.target.value })}
            />
            <span
              className="flex-1 truncate text-xs text-gray-800 dark:text-gray-200"
              title={shape.name}
            >
              {shape.name}
            </span>
            <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
              Fill
              <Switch
                checked={shape.fill}
                onCheckedChange={(v) => updateShape(shape.id, { fill: v })}
              />
            </label>
            <label className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
              Line
              <Switch
                checked={shape.stroke}
                onCheckedChange={(v) => updateShape(shape.id, { stroke: v })}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
