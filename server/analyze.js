import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const port = Number(process.env.PORT || 8787);
const DEFAULT_TIMEOUT_MS = 22000;
const DEFAULT_MAX_INPUT_CHARS = 8000;

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    const config = readFoundryConfig();
    const rawSubmittedText = String(req.body?.text || '').trim();
    const submittedText = compactSubmittedText(rawSubmittedText, config.maxInputChars);
    const isImage = Boolean(req.file?.mimetype?.startsWith('image/'));

    if (!rawSubmittedText && !req.file) {
      return res.status(400).json({ error: 'Provide text or upload a file before analyzing.' });
    }

    if (isImage && !rawSubmittedText) {
      return res.status(400).json({
        error: 'Image critique requires a vision-capable model. Please describe the image in the text box for now.',
      });
    }

    const fileContext = req.file
      ? `Uploaded file metadata: ${req.file.originalname}, ${req.file.mimetype || 'unknown type'}, ${req.file.size} bytes.`
      : 'No file uploaded.';

    const fallbackResourceQueries = defaultResourceQueries(submittedText, req.file);
    const content = [
      fileContext,
      isImage
        ? 'The uploaded image pixels are not being sent to the model. Analyze only the user-provided image description and any file metadata.'
        : '',
      submittedText ? `Submitted text:\n${submittedText}` : '(No extracted text was supplied for this file.)',
    ].filter(Boolean).join('\n\n');

    let data;
    try {
      data = await callCritiqueFoundry(config, content);
    } catch (error) {
      if (!error.recoverable) throw error;
      console.warn('[analyze:fallback]', error.message);
      data = createFallbackAnalysis({
        text: submittedText,
        file: req.file,
        reason: error.publicMessage || 'Azure Foundry did not return a usable response in time.',
      });
    }

    const resourceQueries = arrayOfStrings(data.resourceQueries).length
      ? arrayOfStrings(data.resourceQueries)
      : fallbackResourceQueries;
    const resources = await resolveResources(config, resourceQueries);
    data.resourceQueries = resourceQueries;
    data.resources = resources;

    return res.json(normalizeAnalysis(data, req.file));
  } catch (error) {
    console.error('[analyze]', error);
    return res.status(error.status || 500).json({
      error: error.publicMessage || 'Azure Foundry analysis failed.',
    });
  }
});

app.listen(port, () => {
  console.log(`InsightForge analysis server listening on http://127.0.0.1:${port}`);
});

function readFoundryConfig() {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY?.trim();
  const deployment = process.env.AZURE_FOUNDRY_DEPLOYMENT?.trim();
  const apiVersion = process.env.AZURE_FOUNDRY_API_VERSION?.trim() || '2024-05-01-preview';
  const apiPath = process.env.AZURE_FOUNDRY_API_PATH?.trim();
  const authHeader = process.env.AZURE_FOUNDRY_AUTH_HEADER?.trim().toLowerCase() || 'api-key';
  const bingSearchEndpoint = process.env.BING_SEARCH_ENDPOINT?.trim() || 'https://api.bing.microsoft.com/v7.0/search';
  const bingSearchApiKey = process.env.BING_SEARCH_API_KEY?.trim();
  const timeoutMs = positiveNumber(process.env.AZURE_FOUNDRY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const maxInputChars = positiveNumber(process.env.AZURE_FOUNDRY_MAX_INPUT_CHARS, DEFAULT_MAX_INPUT_CHARS);

  if (!endpoint || !apiKey) {
    const error = new Error('Missing Azure Foundry environment variables.');
    error.status = 500;
    error.publicMessage = 'Azure Foundry endpoint or API key is missing on the server.';
    throw error;
  }

  if (!apiPath && !deployment) {
    const error = new Error('Missing AZURE_FOUNDRY_DEPLOYMENT.');
    error.status = 500;
    error.publicMessage = 'Azure Foundry deployment name is missing on the server.';
    throw error;
  }

  return {
    endpoint,
    apiKey,
    deployment,
    apiVersion,
    apiPath,
    authHeader,
    bingSearchEndpoint,
    bingSearchApiKey,
    timeoutMs,
    maxInputChars,
  };
}

async function callCritiqueFoundry(config, content) {
  return callFoundryJson(config, {
    model: config.deployment,
    maxTokens: 900,
    messages: [
      {
        role: 'system',
        content:
          'You are InsightForge, a concise constructive criticism engine. Use the submitted text and file metadata before reaching conclusions. Return valid compact JSON only. Do not wrap JSON in markdown.',
      },
      {
        role: 'user',
        content: `${analysisInstructions()}\n\n${content}`,
      },
    ],
  });
}

async function callFoundryJson(config, { messages, model, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;
  try {
    response = await fetch(buildFoundryUrl(config), {
      method: 'POST',
      headers: buildHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({
        messages,
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Azure Foundry request timed out.');
      timeoutError.status = 504;
      timeoutError.publicMessage = `Azure Foundry took longer than ${Math.round(config.timeoutMs / 1000)} seconds to return analysis. Try a shorter input or retry in a moment.`;
      timeoutError.recoverable = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Azure Foundry returned ${response.status}: ${detail}`);
    error.status = response.status;
    error.publicMessage = 'Azure Foundry returned an error while analyzing the content.';
    throw error;
  }

  const payload = await response.json();
  const contentText = payload.choices?.[0]?.message?.content || payload.output_text || payload.content;
  try {
    return parseModelJson(contentText);
  } catch (error) {
    error.recoverable = true;
    error.publicMessage = 'Azure Foundry returned an incomplete analysis, so InsightForge prepared a rapid critique scaffold.';
    throw error;
  }
}

function buildHeaders({ apiKey, authHeader }) {
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader === 'authorization' || authHeader === 'both') {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (authHeader === 'api-key' || authHeader === 'both') {
    headers['api-key'] = apiKey;
  }
  return headers;
}

function buildFoundryUrl({ endpoint, deployment, apiVersion, apiPath }) {
  const base = endpoint.replace(/\/$/, '');
  if (apiPath) {
    return `${base}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  }

  const url = new URL(base);
  if (url.hostname.endsWith('.services.ai.azure.com')) {
    return `${url.origin}/models/chat/completions?api-version=${encodeURIComponent(apiVersion || '2024-05-01-preview')}`;
  }

  return `${base}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
}

function analysisInstructions() {
  return `Analyze the submitted content and return JSON with exactly these fields:
{
  "title": "short analysis title",
  "fileType": "Text, PDF, Image, or Uploaded file",
  "summary": "2-3 sentence constructive summary",
  "strengths": ["specific strength", "specific strength", "specific strength"],
  "improvements": ["specific improvement", "specific improvement", "specific improvement"],
  "suggestions": ["actionable next step", "actionable next step", "actionable next step"],
  "resourceQueries": ["search query for learning resource", "search query for learning resource", "search query for learning resource"],
  "confidence": 0,
  "dimensions": {
    "clarity": 0,
    "structure": 0,
    "originality": 0,
    "actionability": 0
  },
  "expanded": "4-6 sentence deeper analysis for the expanded dashboard"
}
Keep every array to exactly 3 items. Dimension and confidence scores must be integers from 0 to 100. For images, do not pretend to see pixels; critique only the user-provided image description. Feedback must be respectful, specific, and useful.`;
}

function parseModelJson(contentText) {
  if (!contentText || typeof contentText !== 'string') {
    throw new Error('Azure Foundry response did not include message content.');
  }

  const cleaned = contentText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Azure Foundry returned content that was not valid JSON.');
  }
}

function normalizeAnalysis(data, file) {
  const resourceQueries = arrayOfStrings(data.resourceQueries || data.resource_queries);
  const resources = normalizeResources(data.resources, resourceQueries);
  const dimensions = data.dimensions || {};
  const normalizedDimensions = {
    clarity: numberWithin(dimensions.clarity, 0, 100, 0),
    structure: numberWithin(dimensions.structure, 0, 100, 0),
    originality: numberWithin(dimensions.originality, 0, 100, 0),
    actionability: numberWithin(dimensions.actionability ?? dimensions.polish, 0, 100, 0),
  };
  const score = averageScore(normalizedDimensions);

  return {
    id: Date.now(),
    title: data.title || file?.originalname || 'Phi-4 analysis',
    fileType: data.fileType || data.file_type || file?.mimetype || 'Submitted content',
    score,
    confidence: numberWithin(data.confidence, 0, 100, 0),
    generatedAt: new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    summary: String(data.summary || ''),
    strengths: arrayOfStrings(data.strengths),
    improvements: arrayOfStrings(data.improvements),
    suggestions: arrayOfStrings(data.suggestions),
    resourceQueries,
    resources,
    visualFindings: null,
    dimensions: normalizedDimensions,
    expanded: String(data.expanded || data.detailedAnalysis || data.summary || ''),
  };
}

function createFallbackAnalysis({ text, file, reason }) {
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const hasEnoughContext = wordCount >= 25;
  const isStartupIdea = /\b(startup|business|idea|market|customer|revenue|product)\b/i.test(text);
  const subject = inferSubject(text, file);
  const dimensions = hasEnoughContext
    ? { clarity: 68, structure: 62, originality: 64, actionability: 58 }
    : { clarity: 42, structure: 34, originality: 50, actionability: 32 };

  const startupQueries = [
    'startup idea validation framework',
    'customer discovery questions for startups',
    'lean startup problem solution fit',
  ];
  const generalQueries = [
    'constructive criticism framework',
    'how to improve clarity structure originality actionability',
    'actionable feedback examples',
  ];

  return {
    title: `${subject} critique`,
    fileType: file?.mimetype || 'Text',
    summary: hasEnoughContext
      ? `InsightForge prepared a rapid critique scaffold because the model response was not available quickly enough. The submission has enough material to identify direction, but it still needs sharper evidence, clearer structure, and more specific next steps.`
      : `InsightForge prepared a rapid critique scaffold because the model response was not available quickly enough. The input is too brief for a confident critique, so the next step is to add the actual idea, audience, evidence, and desired feedback goal.`,
    strengths: hasEnoughContext
      ? [
          'The submission gives the agent enough context to identify a central direction.',
          'The core topic can be turned into a more focused improvement plan.',
          'The content is concise enough to revise quickly.',
        ]
      : [
          'The request clearly asks for critique rather than generic praise.',
          'The topic is short enough to expand into a structured brief.',
          'There is an obvious opportunity to clarify the purpose and audience.',
        ],
    improvements: hasEnoughContext
      ? [
          'Add concrete examples, metrics, or user evidence so the critique can be more accurate.',
          'Separate the problem, audience, solution, and expected outcome.',
          'Define what kind of feedback matters most: clarity, originality, feasibility, or presentation.',
        ]
      : [
          'Add the actual content or startup idea before asking for critique.',
          'Name the target user, problem, solution, and why it matters now.',
          'Include constraints or goals so recommendations can be more actionable.',
        ],
    suggestions: hasEnoughContext
      ? [
          'Rewrite the submission as a short brief with problem, audience, solution, and proof.',
          'Add one measurable outcome or validation signal.',
          'Ask for a specific critique angle before running another analysis.',
        ]
      : [
          'Paste the full startup idea or draft into the text box.',
          'Add three bullets: target user, painful problem, proposed solution.',
          'Run analysis again after adding enough context for a confident assessment.',
        ],
    resourceQueries: isStartupIdea ? startupQueries : generalQueries,
    confidence: hasEnoughContext ? 46 : 28,
    dimensions,
    expanded: `${reason} This fallback is intentionally conservative: it does not pretend to know details that were not submitted. For a stronger result, provide the actual written content, the intended audience, and the specific critique goal. InsightForge will then assess clarity, structure, originality, actionability, gaps, and resource needs with higher confidence.`,
  };
}

function inferSubject(text, file) {
  if (file?.originalname) return file.originalname.replace(/\.[^.]+$/, '');
  if (/\b(startup|business|idea)\b/i.test(text)) return 'Startup idea';
  if (/\b(resume|cv|experience|career)\b/i.test(text)) return 'Resume';
  if (/\b(pitch|deck|presentation)\b/i.test(text)) return 'Pitch';
  return 'Written content';
}

function arrayOfStrings(value) {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => (typeof item === 'string' ? item : item?.query || item?.title || item?.text || ''))
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberWithin(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function averageScore(dimensions) {
  const values = Object.values(dimensions).filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function compactSubmittedText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Input truncated from ${text.length} to ${maxChars} characters for faster Phi-4 analysis.]`;
}

function defaultResourceQueries(text, file) {
  const base = file?.mimetype?.startsWith('image/')
    ? ['visual design critique examples', 'image composition accessibility contrast', 'how to improve visual communication']
    : ['constructive criticism framework', 'how to improve clarity structure originality actionability', 'actionable feedback examples'];
  if (!text) return base;
  return [`${text.slice(0, 80)} improvement examples`, ...base].slice(0, 4);
}

async function resolveResources(config, queries) {
  const uniqueQueries = [...new Set(arrayOfStrings(queries))].slice(0, 4);
  if (!uniqueQueries.length) return [];

  if (!config.bingSearchApiKey) {
    return uniqueQueries.map((query) => ({
      title: query,
      description: 'Search this topic for supporting examples and next-step learning.',
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      category: 'Source Query',
      query,
    }));
  }

  const resourceGroups = await Promise.all(uniqueQueries.map((query) => searchBing(config, query)));
  const resources = resourceGroups.flat();

  return resources.length ? resources.slice(0, 6) : resolveResources({ ...config, bingSearchApiKey: '' }, uniqueQueries);
}

async function searchBing(config, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const url = new URL(config.bingSearchEndpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', '2');
    url.searchParams.set('responseFilter', 'Webpages');

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': config.bingSearchApiKey,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const results = data.webPages?.value || [];
    return results.map((result) => ({
      title: result.name,
      description: result.snippet || `Reference for ${query}`,
      url: result.url,
      category: 'Source',
      query,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResources(resources, fallbackQueries) {
  if (Array.isArray(resources) && resources.length) {
    return resources.map((resource) => {
      if (typeof resource === 'string') {
        return {
          title: resource,
          description: 'Related resource query.',
          url: `https://www.bing.com/search?q=${encodeURIComponent(resource)}`,
          category: 'Resource Query',
        };
      }
      const title = resource.title || resource.query || 'Related resource';
      return {
        title,
        description: resource.description || resource.snippet || 'Related resource for improving this submission.',
        url: resource.url || `https://www.bing.com/search?q=${encodeURIComponent(title)}`,
        category: resource.category || 'Resource',
      };
    });
  }

  return arrayOfStrings(fallbackQueries).map((query) => ({
    title: query,
    description: 'Search this topic for supporting examples and next-step learning.',
    url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    category: 'Source Query',
  }));
}
