export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multi' | 'text';
  options?: { value: string; label: string; description?: string }[];
  followUp?: string;
  required: boolean;
  category: 'core' | 'technical' | 'scope' | 'preference';
}

const QUESTIONS_BY_TYPE: Record<string, Question[]> = {
  saas: [
    {
      id: 'saas-purpose',
      text: 'What is the primary purpose of this SaaS application?',
      type: 'text',
      required: true,
      category: 'core',
    },
    {
      id: 'saas-users',
      text: 'Who are your target users?',
      type: 'single',
      options: [
        { value: 'developers', label: 'Developers' },
        { value: 'business', label: 'Business users' },
        { value: 'consumers', label: 'Consumers' },
        { value: 'enterprises', label: 'Enterprises' },
      ],
      required: true,
      category: 'core',
    },
    {
      id: 'saas-auth',
      text: 'What authentication method do you need?',
      type: 'single',
      options: [
        { value: 'email', label: 'Email/Password' },
        { value: 'oauth', label: 'OAuth (Google, GitHub)' },
        { value: 'sso', label: 'SSO/SAML' },
        { value: 'magic', label: 'Magic Link' },
      ],
      required: true,
      category: 'technical',
    },
    {
      id: 'saas-data',
      text: 'What type of data will the app primarily handle?',
      type: 'single',
      options: [
        { value: 'structured', label: 'Structured data (DB records)' },
        { value: 'files', label: 'Files and media' },
        { value: 'realtime', label: 'Real-time streams' },
        { value: 'mixed', label: 'Mixed content' },
      ],
      required: true,
      category: 'technical',
    },
    {
      id: 'saas-scaling',
      text: 'What scale are you targeting?',
      type: 'single',
      options: [
        { value: 'mvp', label: 'MVP (<100 users)' },
        { value: 'growth', label: 'Growth (100-10K users)' },
        { value: 'scale', label: 'Scale (10K-1M users)' },
        { value: 'enterprise', label: 'Enterprise (1M+ users)' },
      ],
      required: true,
      category: 'scope',
    },
  ],
  cli: [
    {
      id: 'cli-purpose',
      text: 'What does this CLI tool do?',
      type: 'text',
      required: true,
      category: 'core',
    },
    {
      id: 'cli-input',
      text: 'What input does it accept?',
      type: 'single',
      options: [
        { value: 'args', label: 'Command-line arguments' },
        { value: 'stdin', label: 'Stdin/pipe' },
        { value: 'files', label: 'File paths' },
        { value: 'interactive', label: 'Interactive prompts' },
      ],
      required: true,
      category: 'technical',
    },
    {
      id: 'cli-output',
      text: 'What output format?',
      type: 'single',
      options: [
        { value: 'text', label: 'Plain text' },
        { value: 'json', label: 'JSON' },
        { value: 'table', label: 'Formatted table' },
        { value: 'binary', label: 'Binary files' },
      ],
      required: true,
      category: 'technical',
    },
  ],
  api: [
    {
      id: 'api-purpose',
      text: 'What is this API for?',
      type: 'text',
      required: true,
      category: 'core',
    },
    {
      id: 'api-style',
      text: 'What API style?',
      type: 'single',
      options: [
        { value: 'rest', label: 'REST' },
        { value: 'graphql', label: 'GraphQL' },
        { value: 'grpc', label: 'gRPC' },
        { value: 'ws', label: 'WebSocket' },
      ],
      required: true,
      category: 'technical',
    },
    {
      id: 'api-auth',
      text: 'What authentication?',
      type: 'single',
      options: [
        { value: 'jwt', label: 'JWT' },
        { value: 'apikey', label: 'API Key' },
        { value: 'oauth2', label: 'OAuth2' },
        { value: 'none', label: 'None' },
      ],
      required: true,
      category: 'technical',
    },
  ],
  mobile: [
    {
      id: 'mobile-purpose',
      text: 'What does this mobile app do?',
      type: 'text',
      required: true,
      category: 'core',
    },
    {
      id: 'mobile-platforms',
      text: 'Which platforms?',
      type: 'multi',
      options: [
        { value: 'ios', label: 'iOS' },
        { value: 'android', label: 'Android' },
        { value: 'both', label: 'Both' },
      ],
      required: true,
      category: 'scope',
    },
    {
      id: 'mobile-framework',
      text: 'Preferred framework?',
      type: 'single',
      options: [
        { value: 'react-native', label: 'React Native' },
        { value: 'flutter', label: 'Flutter' },
        { value: 'native', label: 'Native (Swift/Kotlin)' },
      ],
      required: true,
      category: 'technical',
    },
  ],
  static: [
    {
      id: 'static-purpose',
      text: 'What is this site for?',
      type: 'text',
      required: true,
      category: 'core',
    },
    {
      id: 'static-pages',
      text: 'Approximate number of pages?',
      type: 'single',
      options: [
        { value: 'landing', label: 'Single landing page' },
        { value: 'small', label: 'Small (2-5 pages)' },
        { value: 'medium', label: 'Medium (5-20 pages)' },
        { value: 'large', label: 'Large (20+ pages)' },
      ],
      required: true,
      category: 'scope',
    },
    {
      id: 'static-cms',
      text: 'Do you need a CMS?',
      type: 'single',
      options: [
        { value: 'none', label: 'No CMS (hardcoded)' },
        { value: 'markdown', label: 'Markdown files' },
        { value: 'headless', label: 'Headless CMS' },
      ],
      required: true,
      category: 'technical',
    },
  ],
};

export function getQuestionsForType(type: string): Question[] {
  return QUESTIONS_BY_TYPE[type] ?? [];
}

export function getQuestionById(id: string): Question | undefined {
  for (const questions of Object.values(QUESTIONS_BY_TYPE)) {
    const found = questions.find((q) => q.id === id);
    if (found) return found;
  }
  return undefined;
}

export class QuestionBank {
  private questionsByType: Record<string, Question[]>;

  constructor() {
    this.questionsByType = { ...QUESTIONS_BY_TYPE };
  }

  getQuestions(type: string): Question[] {
    return this.questionsByType[type] ?? [];
  }

  getQuestion(id: string): Question | undefined {
    return getQuestionById(id);
  }

  addCustomQuestion(type: string, question: Question): void {
    if (!this.questionsByType[type]) {
      this.questionsByType[type] = [];
    }
    this.questionsByType[type].push(question);
  }
}
