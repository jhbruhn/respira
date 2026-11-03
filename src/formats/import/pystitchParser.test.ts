// @vitest-environment node
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { STITCH, MOVE, TRIM, END } from "./constants";
import { PYSTITCH_PES_PARSE_SCRIPT } from "./pystitchParser";

// PyStitch 1.0.0 EmbConstant values, not Respira's internal flag values.
const PY_STITCH = 0;
const PY_JUMP = 1;
const PY_TRIM = 2;
const PY_COLOR_CHANGE = 5;
const PY_END = 4;

let pyodide: PyodideInterface;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  pyodide = await loadPyodide({
    indexURL: dirname(require.resolve("pyodide")),
  });
  pyodide.registerJsModule("js_emb_constants", { STITCH, MOVE, TRIM, END });

  // The PES-reader boundary is deliberately mocked, so these offline tests
  // exercise the exact production Python adapter in a real Pyodide runtime.
  // They do not test PyStitch's binary reader or claim machine compatibility.
  await pyodide.runPythonAsync(`
import sys
import types

pystitch = types.ModuleType('pystitch')
constants = types.ModuleType('pystitch.EmbConstant')
constants.STITCH = 0
constants.JUMP = 1
constants.TRIM = 2
constants.STOP = 3
constants.END = 4
constants.COLOR_CHANGE = 5

class FixtureThread:
    def __init__(self, color, description):
        self.color = color
        self.description = description
        self.catalog_number = 'test'
        self.brand = 'fixture'
        self.chart = ''
    def hex_color(self):
        return '#%06x' % self.color

def read_fixture(path):
    return types.SimpleNamespace(
        stitches=fixture_stitches.to_py(),
        threadlist=[FixtureThread(0x112233, 'First'), FixtureThread(0xaabbcc, 'Second')],
    )

pystitch.read = read_fixture
sys.modules['pystitch'] = pystitch
sys.modules['pystitch.EmbConstant'] = constants
`);
}, 30000);

async function parseRecords(records: number[][]) {
  pyodide.globals.set("fixture_stitches", records);
  const result = await pyodide.runPythonAsync(PYSTITCH_PES_PARSE_SCRIPT);
  try {
    return result.toJs({ dict_converter: Object.fromEntries }) as {
      stitches: number[][];
      threads: Array<{ color: number; description: string }>;
      color_changes: number;
    };
  } finally {
    result.destroy();
    pyodide.globals.delete("fixture_stitches");
  }
}

describe("PyStitch record adapter", () => {
  it("retains a stationary trim followed by a short jump", async () => {
    const result = await parseRecords([
      [0, 0, PY_STITCH],
      [10, 0, PY_STITCH],
      [10, 0, PY_TRIM],
      [30, 0, PY_JUMP],
      [30, 0, PY_STITCH],
      [40, 0, PY_STITCH],
      [40, 0, PY_END],
    ]);

    expect(result.stitches).toEqual([
      [0, 0, STITCH, 0],
      [10, 0, STITCH, 0],
      [10, 0, TRIM, 0],
      [30, 0, MOVE, 0],
      [30, 0, STITCH, 0],
      [40, 0, STITCH, 0],
    ]);
  });

  it("retains repeated needle commands and the needle command after a jump", async () => {
    const result = await parseRecords([
      [10, 20, PY_JUMP],
      [10, 20, PY_STITCH],
      [10, 20, PY_STITCH],
      [15, 20, PY_STITCH],
      [15, 20, PY_END],
    ]);

    expect(result.stitches).toEqual([
      [10, 20, MOVE, 0],
      [10, 20, STITCH, 0],
      [10, 20, STITCH, 0],
      [15, 20, STITCH, 0],
    ]);
  });

  it("retains a needle command at the same position in the next color", async () => {
    const result = await parseRecords([
      [10, 20, PY_STITCH],
      [10, 20, PY_COLOR_CHANGE],
      [10, 20, PY_STITCH],
      [15, 20, PY_STITCH],
      [15, 20, PY_END],
    ]);

    expect(result.stitches).toEqual([
      [10, 20, STITCH, 0],
      [10, 20, STITCH, 1],
      [15, 20, STITCH, 1],
    ]);
    expect(result.color_changes).toBe(1);
    expect(
      result.threads.map(({ color, description }) => ({ color, description })),
    ).toEqual([
      { color: 0x112233, description: "First" },
      { color: 0xaabbcc, description: "Second" },
    ]);
  });
});
