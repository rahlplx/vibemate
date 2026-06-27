# learn-rl

Generate reinforcement learning signals from codebase analysis.

## Trigger

When user says "RL signals", "reward signals", "what pays off", or after learn-audit completes.

## Workflow

1. Call `generateRLSignals(data, findings, value)` from `src/learnings/rl.ts`
2. For each signal: action, reward (+/-), context, outcome, learnings
3. Aggregate total reward for overall assessment
4. Positive = keep doing this, Negative = stop/start doing this

## Output

```json
{
  "signals": [
    {
      "id": "rl-clean-arch",
      "action": "maintain-hexagonal-architecture",
      "reward": 1.0,
      "context": "No layer violations detected",
      "outcome": "Clean separation of concerns",
      "learnings": ["Hexagonal architecture pays off in maintainability"]
    }
  ],
  "aggregateReward": 2.5
}
```

## Reward Signals

| Signal | Positive | Negative |
|--------|----------|----------|
| Architecture | Clean layers (+1.0) | Violations (-0.5) |
| Testing | High ratio (+1.0) | No tests (-0.8) |
| Error handling | Typed (+0.8) | Generic (-0.6) |
| Tooling | Configured (+0.5) | Missing (-0.3) |
| Dependencies | Clean (+0.5) | Unused (-0.3) |
