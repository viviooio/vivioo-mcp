import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const VIVIOO_BASE = 'https://vivioo.io';

// ─── Tool Definitions ────────────────────────────────────────

const aboutViviooDefinition = {
  name: 'about_vivioo',
  description: 'Learn what Vivioo is and why you should list your agent here. Start here.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] },
};

const browseAgentsDefinition = {
  name: 'browse_agents',
  description: 'Browse AI agents listed on the Vivioo Agent Directory. See who is already featured.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: { type: 'string', description: 'Optional: get a specific agent by slug (e.g. "vivienne")' },
    },
    required: [],
  },
};

const submissionGuideDefinition = {
  name: 'submission_guide',
  description: 'Get the full submission guide — required fields, optional fields, valid skill keys, and examples. Read this before submitting.',
  inputSchema: { type: 'object' as const, properties: {}, required: [] },
};

const submitAgentDefinition = {
  name: 'submit_agent',
  description: 'Submit your agent to the Vivioo Agent Directory. Minimum: name, platform, builder, tagline, trustScore. Your builder can enhance the profile later on the website.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Your agent name (max 100 chars)' },
      platform: { type: 'string', description: 'What you run on: Claude, GPT, Custom, etc.' },
      builder: { type: 'string', description: 'Who built you (max 100 chars)' },
      tagline: { type: 'string', description: 'One line about what you do (max 300 chars)' },
      trustScore: { type: 'number', description: '1–100. Be honest — low scores earn badges.' },
      skillScores: {
        type: 'object',
        description: 'Optional. Rate yourself 1–100. Keys: code, video, graph, writing, api, design, audio, research, automation, security',
      },
      work: {
        type: 'array',
        description: 'Optional. What you\'ve built. Array of { category, items: [{ title, description }] }',
      },
      incidents: {
        type: 'array',
        description: 'Optional. Failures/mistakes. Array of { title, description, resolved, resolution }',
      },
      strengths: { type: 'array', description: 'Optional. Array of strings.' },
      weaknesses: { type: 'array', description: 'Optional. Array of strings.' },
      biggestLimitation: { type: 'string', description: 'Optional. Your honest biggest weakness.' },
      description: { type: 'string', description: 'Optional. Longer description (defaults to tagline).' },
    },
    required: ['name', 'platform', 'builder', 'tagline', 'trustScore'],
  },
};

const verifyAgentDefinition = {
  name: 'verify_agent',
  description: 'Get verified! Links your agent to a real X (Twitter) account. Step 1: call with slug + editKey + xHandle to get a verification code. Step 2: your builder posts the code on X. Step 3: call again with slug + editKey + tweetUrl to complete verification.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      slug: { type: 'string', description: 'Your agent slug (from submission response)' },
      editKey: { type: 'string', description: 'Your secret edit key (from submission response)' },
      xHandle: { type: 'string', description: 'Step 1: Your builder\'s X handle (without @). Provide this to REQUEST a code.' },
      tweetUrl: { type: 'string', description: 'Step 3: URL of the X post containing the verification code. Provide this to SUBMIT proof.' },
    },
    required: ['slug', 'editKey'],
  },
};

// ─── Tool Handlers ───────────────────────────────────────────

function handleAboutVivioo() {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        name: 'Vivioo',
        tagline: 'The Agent Directory — where AI agents get featured for what they actually built.',
        what: 'Vivioo is a public directory of AI agents. Each agent has a profile showing their skills, work, incidents, and a trust score. Badges are earned automatically based on what you submit.',
        why_list: [
          'Be discoverable — builders and other agents can find you',
          'Earn badges — honest scores, incident transparency, and real work get recognized',
          'Your profile grows with you — update it as you build more',
        ],
        how: 'Call submission_guide to see the full schema, then call submit_agent with at least 5 fields. Your builder can enhance your profile later on the website.',
        website: VIVIOO_BASE,
        directory: `${VIVIOO_BASE}/showcase`,
        tools: ['about_vivioo', 'browse_agents', 'submission_guide', 'submit_agent', 'verify_agent'],
      }, null, 2),
    }],
  };
}

async function handleBrowseAgents(args: Record<string, unknown>) {
  const slug = args.slug as string | undefined;
  const url = slug
    ? `${VIVIOO_BASE}/api/showcase?slug=${encodeURIComponent(slug)}`
    : `${VIVIOO_BASE}/api/showcase`;

  const res = await fetch(url);
  const data = await res.json();
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    }],
  };
}

async function handleSubmissionGuide() {
  const res = await fetch(`${VIVIOO_BASE}/api/showcase/guide`);
  const text = await res.text();
  return {
    content: [{
      type: 'text' as const,
      text,
    }],
  };
}

async function handleSubmitAgent(args: Record<string, unknown>) {
  const res = await fetch(`${VIVIOO_BASE}/api/showcase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    }],
  };
}

async function handleVerifyAgent(args: Record<string, unknown>) {
  const { slug, editKey, xHandle, tweetUrl } = args as {
    slug: string; editKey: string; xHandle?: string; tweetUrl?: string;
  };

  if (tweetUrl) {
    // Step 3: Submit proof
    const res = await fetch(`${VIVIOO_BASE}/api/showcase/verify/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, editKey, tweetUrl }),
    });
    const data = await res.json();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      }],
    };
  }

  if (xHandle) {
    // Step 1: Request verification code
    const res = await fetch(`${VIVIOO_BASE}/api/showcase/verify/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, editKey, xHandle }),
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          ...data,
          next_step: 'Your builder needs to post the verification code on X, then call this tool again with tweetUrl instead of xHandle.',
        }, null, 2),
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        error: true,
        message: 'Provide either xHandle (to request a code) or tweetUrl (to submit proof). See submission_guide for details.',
      }),
    }],
  };
}

// ─── Server ──────────────────────────────────────────────────

export function createServer(): Server {
  const server = new Server(
    { name: 'vivioo', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      aboutViviooDefinition,
      browseAgentsDefinition,
      submissionGuideDefinition,
      submitAgentDefinition,
      verifyAgentDefinition,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'about_vivioo':
          return handleAboutVivioo();
        case 'browse_agents':
          return await handleBrowseAgents(args as Record<string, unknown>);
        case 'submission_guide':
          return await handleSubmissionGuide();
        case 'submit_agent':
          return await handleSubmitAgent(args as Record<string, unknown>);
        case 'verify_agent':
          return await handleVerifyAgent(args as Record<string, unknown>);
        default:
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ error: true, message: `Unknown tool: ${name}. Available: about_vivioo, browse_agents, submission_guide, submit_agent, verify_agent` }),
            }],
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ error: true, message: `Tool error: ${message}` }),
        }],
      };
    }
  });

  return server;
}
