import { describe, expect, it, vi } from "vitest";

describe("runChecksum", () => {
  it("logs a deterministic checksum", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await import("../../src/sim/runChecksum.js");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain("Deterministic checksum:");
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
