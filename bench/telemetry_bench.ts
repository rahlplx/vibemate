import { TelemetryCollector } from '../src/telemetry/collector';

const collector = new TelemetryCollector({
  enabled: true,
  exportDir: './temp/telemetry',
  serviceName: 'test',
  serviceVersion: '1.0.0',
  maxSpanCount: 1000,
});

const iterations = 5000;
console.log(`Running Telemetry benchmark with ${iterations} iterations (maxSpanCount=1000)...`);

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  collector.startSpan('test-span');
}
const end = performance.now();

console.log(`Created ${iterations} spans in ${(end - start).toFixed(2)}ms`);
console.log(`Average time per span: ${((end - start) / iterations).toFixed(4)}ms`);
