import { useRef, useState, type ChangeEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { PhotoIcon } from "@heroicons/react/24/solid";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useHoopImageStore } from "../../stores/useHoopImageStore";
import { HoopMarkerPicker } from "./HoopMarkerPicker";

/**
 * Sidebar control for the hoop-photo alignment feature: load a photo of the
 * hooped fabric, register it against the 4 corner markers, then show it as an
 * aligned background beneath the pattern to place the next design by eye.
 */
export function HoopAlignment() {
  const {
    status,
    opacity,
    visible,
    showMarkerCheck,
    alignError,
    loadImage,
    setOpacity,
    setVisible,
    setShowMarkerCheck,
    resetClicks,
    clear,
  } = useHoopImageStore(
    useShallow((s) => ({
      status: s.status,
      opacity: s.opacity,
      visible: s.visible,
      showMarkerCheck: s.showMarkerCheck,
      alignError: s.alignError,
      loadImage: s.loadImage,
      setOpacity: s.setOpacity,
      setVisible: s.setVisible,
      setShowMarkerCheck: s.setShowMarkerCheck,
      resetClicks: s.resetClicks,
      clear: s.clear,
    })),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers change.
    e.target.value = "";
    if (!file) return;
    await loadImage(file);
    setPickerOpen(true);
  };

  const handleRealign = () => {
    resetClicks();
    setPickerOpen(true);
  };

  const borderColor =
    status === "aligned"
      ? "border-tertiary-600 dark:border-tertiary-500"
      : "border-gray-400 dark:border-gray-600";
  const iconColor =
    status === "aligned"
      ? "text-tertiary-600 dark:text-tertiary-400"
      : "text-gray-600 dark:text-gray-400";

  return (
    <Card className={cn("p-0 gap-0 border-l-4", borderColor)}>
      <CardContent className="p-4 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <PhotoIcon
            className={cn("w-6 h-6 flex-shrink-0 mt-0.5", iconColor)}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Hoop Photo
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {status === "aligned"
                ? "Aligned to hoop markers"
                : status === "loaded"
                  ? "Loaded — align to the markers"
                  : "Overlay a photo of the hooped fabric"}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {status === "none" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <PhotoIcon className="w-3.5 h-3.5" />
            Load hoop photo
          </Button>
        )}

        {status === "loaded" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-[2]"
              onClick={() => setPickerOpen(true)}
            >
              Align markers
            </Button>
            <Button variant="outline" onClick={clear}>
              Remove
            </Button>
          </div>
        )}

        {status === "aligned" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Show overlay
              </label>
              <Switch
                checked={visible}
                onCheckedChange={setVisible}
                aria-label="Toggle hoop photo overlay"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Marker check
              </label>
              <Switch
                checked={showMarkerCheck}
                onCheckedChange={setShowMarkerCheck}
                aria-label="Toggle marker alignment check squares"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400 w-14 flex-shrink-0">
                Opacity
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="flex-1 cursor-pointer accent-tertiary-600"
                aria-label="Hoop photo opacity"
              />
              <span className="text-xs tabular-nums text-gray-500 w-8 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRealign}
              >
                Re-align
              </Button>
              <Button variant="outline" size="sm" onClick={clear}>
                Remove
              </Button>
            </div>
          </div>
        )}

        {alignError && status !== "aligned" && (
          <p className="mt-3 text-xs text-destructive">{alignError}</p>
        )}
      </CardContent>

      <HoopMarkerPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </Card>
  );
}
