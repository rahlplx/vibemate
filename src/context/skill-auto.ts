// Skill Auto-Activator - Task-to-skill matching (inspired by Claude Code)

interface SkillBudget {
  [skill: string]: number;
}

// Skill definitions with trigger patterns
const SKILL_TRIGGERS: Record<string, string[]> = {
  'tdd': ['test', 'testing', 'tdd', 'red-green', 'refactor', 'unit test', 'integration test', 'fix'],
  'diagnose': ['bug', 'error', 'broken', 'fail', 'crash', 'exception', 'debug', 'diagnose'],
  'zoom-out': ['architecture', 'overview', 'big picture', 'how does', 'explain', 'understand'],
  'grill-me': ['stress test', 'challenge', 'review', 'critique', 'feedback'],
  'grill-with-docs': ['documentation', 'adr', 'design doc', 'context'],
  'handoff': ['handoff', 'context switch', 'new agent', 'transfer'],
  'improve-codebase-architecture': ['refactor', 'improve', 'clean up', 'technical debt', 'architecture'],
  'prototype': ['prototype', 'mockup', 'poc', 'proof of concept', 'quick demo'],
  'setup-matt-pocock-skills': ['setup', 'configure', 'install', 'onboard'],
  'to-issues': ['issue', 'ticket', 'task', 'backlog', 'break down'],
  'to-prd': ['prd', 'requirements', 'spec', 'specification'],
  'triage': ['triage', 'prioritize', 'classify', 'sort'],
  'write-a-skill': ['create skill', 'new skill', 'write skill', 'add skill'],
  'vibe-think': ['think', 'plan', 'design', 'strategy'],
  'vibe-plan': ['plan', 'roadmap', 'milestone'],
  'vibe-break': ['break down', 'decompose', 'split', 'tasks'],
  'vibe-build': ['build', 'implement', 'code', 'develop'],
  'vibe-harness': ['security', 'audit', 'production', 'harness'],
  'vibe-review': ['review', 'code review', 'pr review'],
  'vibe-qa': ['qa', 'testing', 'browser', 'e2e'],
  'vibe-ship': ['deploy', 'ship', 'release', 'push', 'merge'],
  'vibe-learn': ['learn', 'capture', 'pattern'],
  'vibe-evolve': ['evolve', 'improve rules', 'self-improve'],
  'vibe-telemetry': ['telemetry', 'metrics', 'diagnostics'],
  // Irrelevant skills (should NOT be activated)
  'remotion': ['video', 'animation', 'render'],
  'stitch': ['design', 'ui', 'mockup', 'wireframe'],
  'shadcn-ui': ['component library', 'ui components'],
  'react:components': ['react component', 'jsx', 'tsx component']
};

// Token budgets per skill tier
const SKILL_BUDGETS: Record<string, number> = {
  'tdd': 8000,
  'diagnose': 6000,
  'zoom-out': 4000,
  'grill-me': 5000,
  'grill-with-docs': 5000,
  'handoff': 3000,
  'improve-codebase-architecture': 6000,
  'prototype': 4000,
  'setup-matt-pocock-skills': 2000,
  'to-issues': 4000,
  'to-prd': 5000,
  'triage': 3000,
  'write-a-skill': 4000,
  'vibe-think': 6000,
  'vibe-plan': 5000,
  'vibe-break': 4000,
  'vibe-build': 8000,
  'vibe-harness': 6000,
  'vibe-review': 6000,
  'vibe-qa': 5000,
  'vibe-ship': 4000,
  'vibe-learn': 3000,
  'vibe-evolve': 3000,
  'vibe-telemetry': 2000,
  'default': 4000
};

export class SkillAutoActivator {
  activate(taskDescription: string): string[] {
    const taskLower = taskDescription.toLowerCase();
    const activated: string[] = [];
    
    for (const [skill, triggers] of Object.entries(SKILL_TRIGGERS)) {
      // Check if any trigger matches
      const isRelevant = triggers.some(trigger => 
        taskLower.includes(trigger.toLowerCase())
      );
      
      if (isRelevant) {
        activated.push(skill);
      }
    }
    
    // Remove duplicates and irrelevant skills
    const relevant = activated.filter(skill => 
      !['remotion', 'stitch', 'shadcn-ui', 'react:components'].includes(skill)
    );
    
    return [...new Set(relevant)];
  }

  getBudgets(skills: string[]): SkillBudget {
    const budgets: SkillBudget = {};
    
    for (const skill of skills) {
      budgets[skill] = SKILL_BUDGETS[skill] || SKILL_BUDGETS['default'];
    }
    
    return budgets;
  }
}
