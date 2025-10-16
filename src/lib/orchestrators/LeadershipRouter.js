import { geminiGenerate } from '../gemini.js';
import { InformationGatherer } from '../agents/InformationGatherer.js';
import { CoerciveAgent } from '../agents/CoerciveAgent.js';
import { AuthoritativeAgent } from '../agents/AuthoritativeAgent.js';
import { AffiliativeAgent } from '../agents/AffiliativeAgent.js';
import { DemocraticAgent } from '../agents/DemocraticAgent.js';
import { PacesettingAgent } from '../agents/PacesettingAgent.js';
import { CoachingAgent } from '../agents/CoachingAgent.js';

const SELECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    agent: { type: 'STRING' },
    reasons: { type: 'STRING' }
  },
  required: ['agent']
};

export class LeadershipRouter {
  constructor() {
    this.name = 'leadership_router';
    this.agentByName = {
      information_gatherer: new InformationGatherer(),
      coercive: new CoerciveAgent(),
      authoritative: new AuthoritativeAgent(),
      affiliative: new AffiliativeAgent(),
      democratic: new DemocraticAgent(),
      pacesetting: new PacesettingAgent(),
      coaching: new CoachingAgent()
    };
  }

  async _respondWith(agentName, contents, apiKey = null) {
    const agent = this.agentByName[agentName] || this.agentByName.authoritative;
    const res = await agent.respond(contents, apiKey);
    return res?.text || '';
  }

  async orchestrate(contents, apiKey = null) {
    const orchestratorPrompt = `You are a Leadership Style Selector that determines whether to gather more information or connect the user to a specific leadership style.

Your job is to analyze the user's message and decide:
1. If the user is explicitly requesting a specific leadership style (e.g., "can I speak to the authoritative leader?", "I want to talk to the crisis commander")
2. If you have enough information about the situation to recommend a specific leadership style
3. If you need more information before making any recommendations

Available Options:
- "information_gatherer" - Use this when you need more details about the situation, team dynamics, or specific challenges
- "coercive" - Only use when user explicitly requests the Crisis Commander
- "authoritative" - Only use when user explicitly requests the Visionary Leader
- "affiliative" - Only use when user explicitly requests the People Champion
- "democratic" - Only use when user explicitly requests the Consensus Builder
- "pacesetting" - Only use when user explicitly requests the High Performer
- "coaching" - Only use when user explicitly requests the Mentor

Decision Rules:
1. If user explicitly requests a specific leadership style, use that style
2. If user provides vague information like "I have team problems" or "need leadership advice", use "information_gatherer"
3. If user provides detailed situation but doesn't request specific style, use "information_gatherer" to ask more probing questions
4. Only recommend a specific style if user explicitly asks for it

Look for phrases like:
- "can I speak to the [style] leader?"
- "I want to talk to the [style]"
- "connect me to the [style]"
- "let me speak with [style name]"

Output strictly as JSON:
{
  "agent": "chosen_option",
  "reasons": "Brief explanation of why this option was chosen"
}`;

    const result = await geminiGenerate({
      contents,
      systemPrompt: orchestratorPrompt,
      config: { responseMimeType: 'application/json', responseSchema: SELECTION_SCHEMA },
      apiKey
    });

    let agent = 'information_gatherer';
    let reasons = 'Defaulting to information gathering to understand the situation better';

    try {
      const parsed = JSON.parse(result.text || '{}');
      agent = parsed?.agent;
      if (parsed?.reasons) reasons = String(parsed.reasons);
    } catch (_) {}

    const text = await this._respondWith(agent, contents, apiKey);

    const frameSet = { frames: { persona: { value: agent, rationale: [reasons] } } };
    return { assistantMessage: text || '', frameSet, agent, reasons };
  }
}
