# Four-pass import diagnostic

`four-pass.pes` is an original synthetic PES v1 test, containing four rows of ten vertical strands. Each strand has six needle commands, including short securing stitches. Trim requests separate strands. The first thread color returns in the fourth row. There is no photograph or third-party artwork in this fixture.

SHA-256: `774eb9663d9d298e0f60a4ff2111094e634458fae268752372e1047369a508b4`.

Expected needle commands: **60 per color pass, 240 total**.

The actual PyStitch 1.0.0 reader used by Respira returns:

| Command      | Count |
| ------------ | ----: |
| STITCH       |   240 |
| JUMP         |    39 |
| TRIM         |    39 |
| COLOR_CHANGE |     3 |
| END          |     1 |

A separate pyembroidery read reports 40 jumps. These readers are not identical; the regression comparison below uses PyStitch for both versions.

Running this fixture through local Pyodide, the pinned PyStitch wheel, and the production import adapter demonstrated:

| Adapter output           | Coordinate-only filter | Filter removed |
| ------------------------ | ---------------------- | -------------- |
| Needle commands per pass | 51, 50, 50, 50         | 60, 60, 60, 60 |
| STITCH commands          | 201                    | 240            |
| TRIM commands            | 0                      | 39             |
| JUMP commands            | 39                     | 39             |

This fixture is for manual full-reader integration checks. The automated adapter tests mock the PES-reader boundary explicitly and execute the production adapter in real local Pyodide, so normal tests require no PyPI download. Respira's build configuration supplies the PyStitch 1.0.0 wheel for a full-reader check.

The existing PEN encoder still inserts its own locks and automatic cuts. These results establish preservation of reader commands by the adapter; they do not establish a byte-preserving PEN conversion, physical trim behavior, or a successful machine sew-out.
