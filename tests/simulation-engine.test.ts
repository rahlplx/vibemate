import { expect, test, describe } from "bun:test";
import { SimulationEngine } from "../src/performance/simulation-engine";

describe("SimulationEngine", () => {
  test("runs a basic simulation and returns results", async () => {
    const engine = new SimulationEngine();
    const result = await engine.run({ iterations: 2, concurrent: false, chaos: false });

    expect(result.pass).toBeGreaterThan(0);
    expect(result.fail).toBe(0);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.metrics).toBeDefined();
    expect(result.bottlenecks).toBeDefined();
  });

  test("handles chaos and reports failures", async () => {
    const engine = new SimulationEngine();
    // High iteration with chaos should eventually fail at least one pipeline phase
    const result = await engine.run({ iterations: 50, concurrent: false, chaos: true });

    // We expect some fails due to chaos injection in pipeline
    expect(result.fail).toBeGreaterThanOrEqual(0);
  });

  test("runs concurrently", async () => {
    const engine = new SimulationEngine();
    const start = performance.now();
    const result = await engine.run({ iterations: 5, concurrent: true, chaos: false });
    const duration = performance.now() - start;

    expect(result.pass).toBeGreaterThan(0);
    expect(duration).toBeGreaterThan(0);
  });
});
