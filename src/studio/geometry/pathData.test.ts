import { describe, it, expect } from "vitest";
import { parsePathSubpaths, serializeCommands } from "./pathData";

describe("parsePathSubpaths", () => {
  it("splits a compound path into subpaths, each starting with M", () => {
    const subpaths = parsePathSubpaths("M0 0 L10 0 L10 10 Z M2 2 L4 2 L4 4 Z");
    expect(subpaths).toHaveLength(2);
    expect(subpaths[0][0].cmd).toBe("M");
    expect(subpaths[1][0].cmd).toBe("M");
    expect(subpaths[1][0].args).toEqual([2, 2]);
  });

  it("resolves relative commands to absolute", () => {
    const [sub] = parsePathSubpaths("m10 10 l5 0 l0 5 z");
    expect(sub[0].args).toEqual([10, 10]);
    expect(sub[1]).toEqual({ cmd: "L", args: [15, 10] });
    expect(sub[2]).toEqual({ cmd: "L", args: [15, 15] });
  });

  it("folds H and V into L", () => {
    const [sub] = parsePathSubpaths("M0 0 H10 V10");
    expect(sub[1]).toEqual({ cmd: "L", args: [10, 0] });
    expect(sub[2]).toEqual({ cmd: "L", args: [10, 10] });
  });

  it("expands repeated coordinate groups", () => {
    const [sub] = parsePathSubpaths("M0 0 L1 1 2 2 3 3");
    expect(sub.map((c) => c.cmd)).toEqual(["M", "L", "L", "L"]);
    expect(sub[3].args).toEqual([3, 3]);
  });

  it("converts arcs to cubic segments", () => {
    const [sub] = parsePathSubpaths("M0 0 A5 5 0 0 1 10 0");
    expect(sub[0].cmd).toBe("M");
    expect(sub.slice(1).every((c) => c.cmd === "C")).toBe(true);
  });

  it("treats a second implicit M coordinate pair as a lineto", () => {
    const [sub] = parsePathSubpaths("M0 0 10 10");
    expect(sub[1]).toEqual({ cmd: "L", args: [10, 10] });
  });
});

describe("serializeCommands", () => {
  it("round-trips through the parser", () => {
    const d = "M0 0 L10 0 L10 10 Z";
    const [sub] = parsePathSubpaths(d);
    const [again] = parsePathSubpaths(serializeCommands(sub));
    expect(again).toEqual(sub);
  });
});
