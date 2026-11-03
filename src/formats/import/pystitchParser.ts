/** Production PyStitch parsing code, shared with the import adapter tests. */
export const PES_TEMP_FILE_NAME = "/tmp/pattern.pes";

export const PYSTITCH_PES_PARSE_SCRIPT = `
import pystitch
from pystitch.EmbConstant import STITCH, JUMP, TRIM, STOP, END, COLOR_CHANGE
from js_emb_constants import STITCH as JS_STITCH, MOVE as JS_MOVE, TRIM as JS_TRIM, END as JS_END

# Read the PES file
pattern = pystitch.read('${PES_TEMP_FILE_NAME}')

def map_cmd(pystitch_cmd):
    """Map PyStitch command to our JavaScript constant values

    This ensures we have known, consistent values regardless of PyStitch's internal values.
    Our JS constants use Respira's internal bitmask values:
    STITCH = 0x00, MOVE/JUMP = 0x10, TRIM = 0x20, END = 0x100
    """
    if pystitch_cmd == STITCH:
        return JS_STITCH
    elif pystitch_cmd == JUMP:
        return JS_MOVE  # PyStitch JUMP maps to our MOVE constant
    elif pystitch_cmd == TRIM:
        return JS_TRIM
    elif pystitch_cmd == END:
        return JS_END
    else:
        # For any other commands, preserve as bitmask
        result = JS_STITCH
        if pystitch_cmd & JUMP:
            result |= JS_MOVE
        if pystitch_cmd & TRIM:
            result |= JS_TRIM
        if pystitch_cmd & END:
            result |= JS_END
        return result

# Each PyStitch record is [x, y, cmd]. Assign color indices while keeping
# all needle, movement, and trim commands in order. Equal coordinates do
# not imply duplicate operations: a trim or a needle drop after a jump
# still matters, and repeated needle drops may be intentional.

stitches_with_colors = []
current_color = 0

for i, stitch in enumerate(pattern.stitches):
    x, y, cmd = stitch

    # Check for color change command
    if cmd == COLOR_CHANGE:
        current_color += 1
        continue

    # Check for stop command - skip it
    if cmd == STOP:
        continue

    # Check for standalone END command (no stitch data)
    if cmd == END:
        continue

    # Add actual stitch with current color index and mapped command
    mapped_cmd = map_cmd(cmd)
    stitches_with_colors.append([x, y, mapped_cmd, current_color])

# Convert to JSON-serializable format
{
    'stitches': stitches_with_colors,
    'threads': [
        {
            'color': thread.color if hasattr(thread, 'color') else 0,
            'hex': thread.hex_color() if hasattr(thread, 'hex_color') else '#000000',
            'catalog_number': thread.catalog_number if hasattr(thread, 'catalog_number') else -1,
            'brand': thread.brand if hasattr(thread, 'brand') else "",
            'description': thread.description if hasattr(thread, 'description') else "",
            'chart': thread.chart if hasattr(thread, 'chart') else ""
        }
        for thread in pattern.threadlist
    ],
    'thread_count': len(pattern.threadlist),
    'stitch_count': len(stitches_with_colors),
    'color_changes': current_color
}
`;
