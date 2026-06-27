// Harness Compiler - Maps source of truth to native agent artifacts
import { AgentType, AgentConfig, CompiledArtifacts, OKFBundle } from '../types.js';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { join } from 'path';

// Agent configurations
const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'claude-code': {
    type: 'claude-code',
    pathPrefix: '~/.claude/skills/',
    nonInteractiveFlag: '--print',
    skillDir: '.claude/skills',
    configFiles: ['CLAUDE.md', '.claude-plugin/plugin.json']
  },
  'opencode': {
    type: 'opencode',
    pathPrefix: '~/.claude/skills/',
    nonInteractiveFlag: '--no-input',
    skillDir: '.opencode/skills',
    configFiles: ['opencode.json']
  },
  'cursor': {
    type: 'cursor',
    pathPrefix: '~/.cursor/skills/',
    nonInteractiveFlag: '',
    skillDir: '.cursor/rules',
    configFiles: ['.cursorrules', '.cursor/rules/*.mdc']
  },
  'codex': {
    type: 'codex',
    pathPrefix: '$CODEX_CONFIG_DIR/skills/',
    nonInteractiveFlag: '--non-interactive',
    skillDir: '.codex/skills',
    configFiles: ['AGENTS.md']
  },
  'kilocode': {
    type: 'kilocode',
    pathPrefix: '~/.kilocode/skills/',
    nonInteractiveFlag: '',
    skillDir: '.kilocode/skills',
    configFiles: ['KILOCODE.md', '.kilocode/plugin.json']
  },
  'antigravity': {
    type: 'antigravity',
    pathPrefix: '~/.config/antigravity/skills/',
    nonInteractiveFlag: '',
    skillDir: '.antigravity/skills',
    configFiles: ['.antigravity/context.md', '.antigravity/config.json']
  },
  'openhands': {
    type: 'openhands',
    pathPrefix: '~/.openhands/skills/',
    nonInteractiveFlag: '',
    skillDir: '.openhands/skills',
    configFiles: ['AGENTS.md', '.openhands/skills.toml']
  },
  'unknown': {
    type: 'unknown',
    pathPrefix: '',
    nonInteractiveFlag: '',
    skillDir: '',
    configFiles: []
  }
};

export class HarnessCompiler {
  private root: string;
  private agentType: AgentType;

  constructor(root: string, agentType: AgentType) {
    this.root = root;
    this.agentType = agentType;
  }

  async compile(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    switch (this.agentType) {
      case 'claude-code':
        return this.compileClaudeCode(okfBundle, skills);
      case 'opencode':
        return this.compileOpenCode(okfBundle, skills);
      case 'cursor':
        return this.compileCursor(okfBundle, skills);
      case 'codex':
        return this.compileCodex(okfBundle, skills);
      case 'kilocode':
        return this.compileKilocode(okfBundle, skills);
      case 'antigravity':
        return this.compileAntigravity(okfBundle, skills);
      case 'openhands':
        return this.compileOpenhands(okfBundle, skills);
      default:
        throw new Error(`Unsupported agent type: ${this.agentType}`);
    }
  }

  private async compileClaudeCode(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.claude', 'skills');
    await mkdir(skillDir, { recursive: true });

    // Generate CLAUDE.md with OKF context
    const claudeMd = this.generateClaudeMd(okfBundle);
    await writeFile(join(this.root, 'CLAUDE.md'), claudeMd);

    // Generate skill files
    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    // Generate plugin.json
    const pluginJson = {
      name: 'vibemate',
      version: '1.0.0',
      description: 'Vibemate unified AI coding agent plugin',
      skills: skills.map(s => ({
        name: s,
        path: `.claude/skills/${s}.md`,
        description: `Vibemate skill: ${s}`
      })),
      context: {
        okfBundle: '.agents/okf-bundle',
        telemetry: '.vibe/telemetry'
      }
    };
    await mkdir(join(this.root, '.claude-plugin'), { recursive: true });
    await writeFile(join(this.root, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginJson, null, 2));

    return {
      agent: 'claude-code',
      skills: skills.map(s => `.claude/skills/${s}.md`),
      config: '.claude-plugin/plugin.json',
      context: 'CLAUDE.md',
      hooks: []
    };
  }

  private async compileOpenCode(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.opencode', 'skills');
    await mkdir(skillDir, { recursive: true });

    // Generate opencode.json
    const opencodeJson = {
      name: 'vibemate',
      version: '1.0.0',
      provider: {
        name: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 8192
      },
      skills: skills.map(s => ({
        name: s,
        path: `.opencode/skills/${s}.md`
      })),
      context: {
        okfBundle: '.agents/okf-bundle',
        telemetry: '.vibe/telemetry'
      }
    };
    await writeFile(join(this.root, 'opencode.json'), JSON.stringify(opencodeJson, null, 2));

    // Generate skill files
    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    return {
      agent: 'opencode',
      skills: skills.map(s => `.opencode/skills/${s}.md`),
      config: 'opencode.json',
      context: '.agents/okf-bundle',
      hooks: []
    };
  }

  private async compileCursor(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const ruleDir = join(this.root, '.cursor', 'rules');
    await mkdir(ruleDir, { recursive: true });

    // Generate .cursorrules
    const cursorRules = this.generateCursorRules(okfBundle);
    await writeFile(join(this.root, '.cursorrules'), cursorRules);

    // Generate .mdc rule files
    for (const skill of skills) {
      const ruleContent = await this.generateCursorRule(skill, okfBundle);
      await writeFile(join(ruleDir, `${skill}.mdc`), ruleContent);
    }

    return {
      agent: 'cursor',
      skills: skills.map(s => `.cursor/rules/${s}.mdc`),
      config: '.cursorrules',
      context: '.agents/okf-bundle',
      hooks: []
    };
  }

  private async compileCodex(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.codex', 'skills');
    await mkdir(skillDir, { recursive: true });

    // Generate AGENTS.md
    const agentsMd = this.generateAgentsMd(okfBundle);
    await writeFile(join(this.root, 'AGENTS.md'), agentsMd);

    // Generate skill files
    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    return {
      agent: 'codex',
      skills: skills.map(s => `.codex/skills/${s}.md`),
      config: 'AGENTS.md',
      context: '.agents/okf-bundle',
      hooks: []
    };
  }

  private async compileKilocode(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.kilocode', 'skills');
    await mkdir(skillDir, { recursive: true });

    const kilocodeMd = this.generateContextMd('KILOCODE', okfBundle);
    await writeFile(join(this.root, 'KILOCODE.md'), kilocodeMd);

    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    const pluginJson = { name: 'vibemate', version: '1.0.0', skills: skills.map(s => `.kilocode/skills/${s}.md`) };
    await mkdir(join(this.root, '.kilocode'), { recursive: true });
    await writeFile(join(this.root, '.kilocode', 'plugin.json'), JSON.stringify(pluginJson, null, 2));

    return {
      agent: 'kilocode',
      skills: skills.map(s => `.kilocode/skills/${s}.md`),
      config: '.kilocode/plugin.json',
      context: 'KILOCODE.md',
      hooks: []
    };
  }

  private async compileAntigravity(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.antigravity', 'skills');
    await mkdir(skillDir, { recursive: true });

    const contextMd = this.generateContextMd('Antigravity', okfBundle);
    await writeFile(join(this.root, '.antigravity', 'context.md'), contextMd);

    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    const configJson = { name: 'vibemate', version: '1.0.0', skills: skills.map(s => `.antigravity/skills/${s}.md`) };
    await writeFile(join(this.root, '.antigravity', 'config.json'), JSON.stringify(configJson, null, 2));

    return {
      agent: 'antigravity',
      skills: skills.map(s => `.antigravity/skills/${s}.md`),
      config: '.antigravity/config.json',
      context: '.antigravity/context.md',
      hooks: []
    };
  }

  private async compileOpenhands(okfBundle: OKFBundle, skills: string[]): Promise<CompiledArtifacts> {
    const skillDir = join(this.root, '.openhands', 'skills');
    await mkdir(skillDir, { recursive: true });

    const agentsMd = this.generateAgentsMd(okfBundle);
    await writeFile(join(this.root, 'AGENTS.md'), agentsMd);

    for (const skill of skills) {
      const skillContent = await this.generateSkillContent(skill, okfBundle);
      await writeFile(join(skillDir, `${skill}.md`), skillContent);
    }

    // skills.toml — minimal TOML manifest
    const tomlLines = ['[vibemate]', `version = "1.0.0"`, 'skills = ['];
    for (const skill of skills) {
      tomlLines.push(`  ".openhands/skills/${skill}.md",`);
    }
    tomlLines.push(']');
    await writeFile(join(this.root, '.openhands', 'skills.toml'), tomlLines.join('\n') + '\n');

    return {
      agent: 'openhands',
      skills: skills.map(s => `.openhands/skills/${s}.md`),
      config: '.openhands/skills.toml',
      context: 'AGENTS.md',
      hooks: []
    };
  }

  private generateContextMd(agentName: string, okfBundle: OKFBundle): string {
    const architectureDocs = okfBundle.concepts
      .filter(c => c.frontmatter.type === 'architecture-decision')
      .map(c => `- **${c.frontmatter.title ?? 'Untitled'}**: ${c.frontmatter.description ?? 'No description'}`)
      .join('\n');

    return `# ${agentName} Context — Vibemate

## Architecture Decisions
${architectureDocs || 'No architecture decisions recorded yet.'}

## Project Root
${okfBundle.root}
`;
  }

  private generateClaudeMd(okfBundle: OKFBundle): string {
    const architectureDocs = okfBundle.concepts
      .filter(c => c.frontmatter.type === 'architecture-decision')
      .map(c => `- **${c.frontmatter.title ?? 'Untitled'}**: ${c.frontmatter.description ?? 'No description'}`)
      .join('\n');

    return `# Claude Code Context - Vibemate

## Project Context

This project uses Vibemate for unified AI coding agent orchestration.

## OKF Bundle

The project knowledge base is located at \`.agents/okf-bundle/\`.

### Architectural Decisions

${architectureDocs}

## Skills Available

- TDD workflow (red-green-refactor)
- Security audit
- Performance optimization
- Testing strategy

## Rules

1. Always follow TDD: write failing test first
2. Check OKF bundle for architectural decisions before implementing
3. Use MCP servers for documentation and testing
4. Log learnings to OKF bundle after completing tasks

## Telemetry

All actions are logged to \`.vibe/telemetry/\` for retrospective analysis.
    `;
  }

  private generateCursorRules(okfBundle: OKFBundle): string {
    const architectureDocs = okfBundle.concepts
      .filter(c => c.frontmatter.type === 'architecture-decision')
      .map(c => `- ${c.frontmatter.title ?? 'Untitled'}: ${c.frontmatter.description ?? 'No description'}`)
      .join('\n');

    return `# Cursor Rules - Vibemate

## Context

Read OKF bundle at \`.agents/okf-bundle/\` for project context.

## Architecture

${architectureDocs}

## Workflow

1. Check architectural decisions before implementing
2. Follow TDD: write test first
3. Use Context7 MCP for documentation
4. Run Playwright MCP for UI testing
    `;
  }

  private generateAgentsMd(okfBundle: OKFBundle): string {
    const architectureDocs = okfBundle.concepts
      .filter(c => c.frontmatter.type === 'architecture-decision')
      .map(c => `## ${c.frontmatter.title ?? 'Untitled'}\n\n${c.frontmatter.description ?? 'No description'}\n\n${c.body}`)
      .join('\n\n');

    return `# AGENTS.md - Vibemate Context

## Project Knowledge

This project uses Vibemate for unified AI coding agent orchestration.

## OKF Bundle

Read the OKF bundle at \`.agents/okf-bundle/\` for architectural decisions and learnings.

${architectureDocs}

## Rules

1. Follow TDD methodology
2. Check OKF bundle before implementing
3. Use MCP servers for documentation
4. Log learnings after completing tasks
    `;
  }

  private async generateSkillContent(skill: string, okfBundle: OKFBundle): Promise<string> {
    const relevantDocs = okfBundle.concepts
      .filter(c => c.frontmatter.tags?.includes(skill) || c.frontmatter.title?.toLowerCase().includes(skill))
      .map(c => `### ${c.frontmatter.title}\n\n${c.body}`)
      .join('\n\n');

    return `# ${skill}

## Overview

Vibemate skill: ${skill}

## Context from OKF Bundle

${relevantDocs || 'No specific context found for this skill.'}

## Workflow

1. Read relevant OKF documents
2. Follow established patterns
3. Implement with TDD
4. Log learnings if novel pattern discovered
    `;
  }

  private async generateCursorRule(skill: string, _okfBundle: OKFBundle): Promise<string> {
    return `---
description: Vibemate skill - ${skill}
globs: 
alwaysApply: false
---

# ${skill}

## Context

Read OKF bundle at \`.agents/okf-bundle/\` for project-specific context.

## Instructions

1. Follow TDD workflow
2. Check architectural decisions before implementing
3. Use MCP servers for documentation and testing
    `;
  }

  async verify(): Promise<{ valid: boolean; missing: string[] }> {
    const config = AGENT_CONFIGS[this.agentType];
    const missing: string[] = [];

    for (const file of config.configFiles) {
      if (file.includes('*')) {
        // Glob pattern - check if any files match
        const dir = join(this.root, file.replace('*', ''));
        try {
          const files = await readdir(dir);
          if (files.length === 0) missing.push(file);
        } catch (error) {
          console.error(`[Compiler] Failed to read directory for ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          missing.push(file);
        }
      } else {
        try {
          await readFile(join(this.root, file));
        } catch (error) {
          console.error(`[Compiler] Missing config file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          missing.push(file);
        }
      }
    }

    return { valid: missing.length === 0, missing };
  }
}
