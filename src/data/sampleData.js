export const samplePrompt = `InsightForge is a reasoning agent that evaluates written content, identifies weaknesses, generates actionable improvement plans, and recommends learning resources.

It should help a user understand what works, what needs polish, and which resource links can guide the next revision.`;

export const learningResources = [
  {
    title: 'Azure AI Foundry documentation',
    description: 'Model deployment, endpoints, safety, and agent orchestration guidance.',
    url: 'https://learn.microsoft.com/azure/ai-foundry/',
    category: 'Foundry',
  },
  {
    title: 'Microsoft Phi model family',
    description: 'Reference material for Phi models and their intended use cases.',
    url: 'https://learn.microsoft.com/azure/ai-foundry/concepts/models',
    category: 'Models',
  },
  {
    title: 'Writing actionable feedback',
    description: 'A concise guide to clear, specific, improvement-oriented critique.',
    url: 'https://www.nngroup.com/articles/feedback-message-guidelines/',
    category: 'Critique',
  },
  {
    title: 'Web Content Accessibility Guidelines',
    description: 'Use accessibility checks to improve visual and document quality.',
    url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
    category: 'Quality',
  },
  {
    title: 'React documentation',
    description: 'Build reliable interactive interfaces around the analysis workflow.',
    url: 'https://react.dev/',
    category: 'Frontend',
  },
];

export const recentAnalyses = [];
