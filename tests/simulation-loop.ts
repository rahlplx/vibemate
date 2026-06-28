import { SimulationEngine } from "../src/performance/simulation-engine"

async function main() {
  const engine = new SimulationEngine()

  console.log("\n=== RUNNING HIGH-LOAD CONCURRENT CHAOS SIMULATION ===")
  const res = await engine.run({ iterations: 100, concurrent: true, chaos: true })
  console.log(JSON.stringify(res, null, 2))

  process.exit(res.fail > 50 ? 1 : 0) // Expect some chaos failures but not too many
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
