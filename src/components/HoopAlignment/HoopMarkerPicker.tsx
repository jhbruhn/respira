import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import {
  ArrowUturnLeftIcon,
  TrashIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHoopImageStore } from "../../stores/useHoopImageStore";

interface HoopMarkerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Magnifier loupe settings
const MAG_SIZE = 200; // px diameter
const MAG_ZOOM = 3; // magnification factor (relative to the on-screen image)

interface HoverState {
  clientX: number;
  clientY: number;
  natX: number; // natural image px under cursor
  natY: number;
  scale: number; // displayed px per natural px (image is shrunk to fit)
}

/**
 * Modal for registering the hoop photo: the user clicks the four corner markers
 * (in any order) on the loaded photo. Clicks are captured in the image's natural
 * pixel space; the store classifies them by side, solves the homography and warps
 * the image once the fourth marker is placed, then this dialog auto-closes.
 */
export function HoopMarkerPicker({
  open,
  onOpenChange,
}: HoopMarkerPickerProps) {
  const {
    imageUrl,
    imageSize,
    rawClicks,
    status,
    alignError,
    detectionCandidates,
    addClick,
    autoDetect,
    undoClick,
    resetClicks,
  } = useHoopImageStore(
    useShallow((s) => ({
      imageUrl: s.imageUrl,
      imageSize: s.imageSize,
      rawClicks: s.rawClicks,
      status: s.status,
      alignError: s.alignError,
      detectionCandidates: s.detectionCandidates,
      addClick: s.addClick,
      autoDetect: s.autoDetect,
      undoClick: s.undoClick,
      resetClicks: s.resetClicks,
    })),
  );

  // Auto-close once four valid clicks produced an alignment.
  useEffect(() => {
    if (open && status === "aligned" && rawClicks.length === 4 && !alignError) {
      onOpenChange(false);
    }
  }, [open, status, rawClicks.length, alignError, onOpenChange]);

  const [hover, setHover] = useState<HoverState | null>(null);

  const toNatural = (e: MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * (imageSize?.width ?? 0),
      y: ((e.clientY - rect.top) / rect.height) * (imageSize?.height ?? 0),
    };
  };

  const handleImageClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!imageSize || rawClicks.length >= 4) return;
    const p = toNatural(e);
    addClick({ x: p.x, y: p.y });
  };

  const handleMove = (e: MouseEvent<HTMLImageElement>) => {
    if (!imageSize) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / imageSize.width; // displayed px per natural px
    setHover({
      clientX: e.clientX,
      clientY: e.clientY,
      natX: (e.clientX - rect.left) / scale,
      natY: (e.clientY - rect.top) / scale,
      scale,
    });
  };

  const remaining = 4 - rawClicks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Align hoop photo</DialogTitle>
          <DialogDescription>
            {remaining > 0
              ? `Auto-detect the markers, or click the center of each of the 4 corner markers (any order). ${remaining} left.`
              : "All markers placed — aligning…"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={autoDetect}
            disabled={!imageUrl}
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Auto-detect markers
          </Button>
          <span className="text-xs text-muted-foreground">
            or click the 4 markers below
          </span>
        </div>

        {imageUrl && imageSize && (
          <div className="relative inline-block max-h-[65vh] overflow-auto mx-auto">
            <img
              src={imageUrl}
              onClick={handleImageClick}
              onMouseMove={handleMove}
              onMouseLeave={() => setHover(null)}
              draggable={false}
              className="block max-h-[65vh] max-w-full select-none cursor-crosshair"
              alt="Hooped fabric to align"
            />
            {/* Auto-detect candidates (yellow) — shown when detection ran but
                didn't yield a clean set of 4, so you can see what it found. */}
            {rawClicks.length === 0 &&
              detectionCandidates.map((c, i) => (
                <div
                  key={`cand-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-yellow-400/90"
                  style={{
                    left: `${(c.x / imageSize.width) * 100}%`,
                    top: `${(c.y / imageSize.height) * 100}%`,
                    width: `${(c.side / imageSize.width) * 100}%`,
                    height: `${(c.side / imageSize.height) * 100}%`,
                  }}
                />
              ))}
            {rawClicks.map((p, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${(p.x / imageSize.width) * 100}%`,
                  top: `${(p.y / imageSize.height) * 100}%`,
                }}
              >
                <div className="w-5 h-5 rounded-full border-2 border-white bg-red-500/80 shadow flex items-center justify-center text-[10px] font-bold text-white">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Magnifier loupe — portaled to <body> so it escapes the dialog's
            CSS transform (which would otherwise offset fixed positioning),
            keeping the crosshair centered on the cursor. */}
        {hover &&
          imageUrl &&
          imageSize &&
          createPortal(
            <div
              className="pointer-events-none fixed z-[60] rounded-full border-2 border-white shadow-xl ring-1 ring-black/40"
              style={{
                width: MAG_SIZE,
                height: MAG_SIZE,
                left: hover.clientX - MAG_SIZE / 2,
                top: hover.clientY - MAG_SIZE / 2,
                backgroundImage: `url("${imageUrl}")`,
                backgroundRepeat: "no-repeat",
                // Zoom is relative to the on-screen (shrunk) image: multiply the
                // display scale by MAG_ZOOM so MAG_ZOOM means "×what you see".
                backgroundSize: `${imageSize.width * hover.scale * MAG_ZOOM}px ${imageSize.height * hover.scale * MAG_ZOOM}px`,
                backgroundPosition: `${MAG_SIZE / 2 - hover.natX * hover.scale * MAG_ZOOM}px ${MAG_SIZE / 2 - hover.natY * hover.scale * MAG_ZOOM}px`,
              }}
            >
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-red-500/80" />
              <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-red-500/80" />
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500" />
            </div>,
            document.body,
          )}

        {alignError && (
          <p className="text-sm text-destructive text-center">{alignError}</p>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undoClick}
              disabled={rawClicks.length === 0}
            >
              <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetClicks}
              disabled={rawClicks.length === 0}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
