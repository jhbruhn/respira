import { describe, it, expect } from "vitest";
import { getErrorDetails, SewingMachineError } from "./errorCodeHelpers";

describe("errorCodeHelpers", () => {
  describe("shortName validation", () => {
    it("should ensure all error shortNames are 15 characters or less", () => {
      // Get all error codes except None (0xDD) and Unknown (0xEE) since they might not have details
      const errorCodes = Object.values(SewingMachineError).filter(
        (code) =>
          code !== SewingMachineError.None &&
          code !== SewingMachineError.Unknown &&
          code !== SewingMachineError.OtherError,
      );

      const violations: Array<{
        code: number;
        shortName: string;
        length: number;
      }> = [];

      errorCodes.forEach((code) => {
        const details = getErrorDetails(code);
        if (details?.shortName) {
          const length = details.shortName.length;
          if (length > 15) {
            violations.push({
              code,
              shortName: details.shortName,
              length,
            });
          }
        }
      });

      // If there are violations, create a helpful error message
      if (violations.length > 0) {
        const violationMessages = violations
          .map(
            (v) =>
              `Error code 0x${v.code.toString(16).toUpperCase()}: "${v.shortName}" (${v.length} chars)`,
          )
          .join("\n  ");

        expect.fail(
          `The following error shortNames exceed 15 characters:\n  ${violationMessages}`,
        );
      }

      // Assertion to confirm test ran
      expect(violations).toHaveLength(0);
    });

    it("should ensure all error details have a shortName", () => {
      // Get all error codes except None (0xDD) and Unknown (0xEE)
      const errorCodes = Object.values(SewingMachineError).filter(
        (code) =>
          code !== SewingMachineError.None &&
          code !== SewingMachineError.Unknown &&
          code !== SewingMachineError.OtherError,
      );

      const missing: number[] = [];

      errorCodes.forEach((code) => {
        const details = getErrorDetails(code);
        if (details && !details.shortName) {
          missing.push(code);
        }
      });

      if (missing.length > 0) {
        const missingCodes = missing
          .map((code) => `0x${code.toString(16).toUpperCase()}`)
          .join(", ");

        expect.fail(
          `The following error codes are missing shortName: ${missingCodes}`,
        );
      }

      expect(missing).toHaveLength(0);
    });
  });
});
