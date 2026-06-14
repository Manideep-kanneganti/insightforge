const API_ROUTE = '/api/analyze';

export async function analyzeWithPhi4({ text, file }) {
  const formData = new FormData();
  formData.append('text', await buildUploadedText({ text, file }));
  if (file) formData.append('file', file);

  const response = await fetch(API_ROUTE, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `Analysis service returned ${response.status}`);
  }

  return normalizeAnalysis(await response.json());
}

async function buildUploadedText({ text, file }) {
  const parts = [text || ''];

  if (file && isTextFile(file)) {
    const fileText = await file.text();
    parts.push(`\n\nUploaded file: ${file.name}\n${fileText}`);
  } else if (file) {
    parts.push(`\n\nUploaded file: ${file.name} (${file.type || 'unknown type'}, ${file.size} bytes).`);
  }

  return parts.join('\n').trim();
}

function isTextFile(file) {
  return (
    file.type.startsWith('text/') ||
    ['.txt', '.md', '.csv', '.json'].some((extension) => file.name.toLowerCase().endsWith(extension))
  );
}

function normalizeAnalysis(payload) {
  const resourceQueries = arrayOfStrings(payload.resourceQueries || payload.resource_queries);
  const dimensions = payload.dimensions || {
    clarity: payload.score || 0,
    structure: payload.score || 0,
    originality: payload.score || 0,
    actionability: payload.score || 0,
  };
  const normalizedDimensions = {
    clarity: numberWithin(dimensions.clarity, 0, 100, 0),
    structure: numberWithin(dimensions.structure, 0, 100, 0),
    originality: numberWithin(dimensions.originality, 0, 100, 0),
    actionability: numberWithin(dimensions.actionability ?? dimensions.polish, 0, 100, 0),
  };

  return {
    id: payload.id || Date.now(),
    title: payload.title || 'Phi-4 analysis',
    fileType: payload.fileType || payload.file_type || 'Submitted content',
    score: averageScore(normalizedDimensions),
    confidence: numberWithin(payload.confidence, 0, 100, 0),
    generatedAt: payload.generatedAt || payload.generated_at || new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    summary: payload.summary || 'No summary returned.',
    strengths: arrayOfStrings(payload.strengths),
    improvements: arrayOfStrings(payload.improvements),
    suggestions: arrayOfStrings(payload.suggestions),
    resourceQueries,
    resources: normalizeResources(payload.resources, resourceQueries),
    visualFindings: payload.visualFindings || payload.visual_findings || null,
    dimensions: normalizedDimensions,
    expanded: payload.expanded || payload.detailedAnalysis || payload.detailed_analysis || payload.summary || '',
  };
}

function arrayOfStrings(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => (typeof item === 'string' ? item : item?.title || item?.query || item?.text || ''))
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
