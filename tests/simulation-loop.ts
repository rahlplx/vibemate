import { SimulationEngine } from "../src/performance/simulation-engine"

async function main() {
  const engine = new SimulationEngine()

  console.log("\n=== RUNNING OPTIMIZED CONCURRENT SIMULATION ===")
  const res = await engine.run({ iterations: 200, concurrent: true, chaos: true })
  console.log(JSON.stringify(res, null, 2))

  process.exit(res.fail > 100 ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
