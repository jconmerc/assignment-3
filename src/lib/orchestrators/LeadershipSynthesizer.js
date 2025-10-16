import { geminiGenerate } from '../gemini.js';
import { CoerciveAgent } from '../agents/CoerciveAgent.js';
import { AuthoritativeAgent } from '../agents/AuthoritativeAgent.js';
import { AffiliativeAgent } from '../agents/AffiliativeAgent.js';
import { DemocraticAgent } from '../agents/DemocraticAgent.js';
import { PacesettingAgent } from '../agents/PacesettingAgent.js';
import { CoachingAgent } from '../agents/CoachingAgent.js';

export class LeadershipSynthesizer {
  constructor() {
    this.name = 'leadership_synthesizer';
    this.agents = {
      coercive: new CoerciveAgent(),
      authoritative: new AuthoritativeAgent(),
      affiliative: new AffiliativeAgent(),
      democratic: new DemocraticAgent(),
      pacesetting: new PacesettingAgent(),
      coaching: new CoachingAgent()
    };
  }

  async orchestrate(contents, apiKey = null) {
    // Get responses from all agents
    const agentResponses = await Promise.all([
      this.agents.coercive.respond(contents, apiKey),
      this.agents.authoritative.respond(contents, apiKey),
      this.agents.affiliative.respond(contents, apiKey),
      this.agents.democratic.respond(contents, apiKey),
      this.agents.pacesetting.respond(contents, apiKey),
      this.agents.coaching.respond(contents, apiKey)
    ]);

    const agentNames = ['coercive', 'authoritative', 'affiliative', 'democratic', 'pacesetting', 'coaching'];

    // Create a combined prompt for synthesis
    const synthesisPrompt = `You are a Leadership Synthesis Expert who combines insights from multiple leadership styles to create a comprehensive, balanced response.

You have received responses from 6 different leadership style advisors:
1. Coercive (Crisis Commander): ${agentResponses[0].text}
2. Authoritative (Visionary Leader): ${agentResponses[1].text}
3. Affiliative (People Champion): ${agentResponses[2].text}
4. Democratic (Consensus Builder): ${agentResponses[3].text}
5. Pacesetting (High Performer): ${agentResponses[4].text}
6. Coaching (Mentor): ${agentResponses[5].text}

Your task is to synthesize these different perspectives into a cohesive, practical leadership response that:
- Combines the best elements from multiple styles
- Addresses both immediate and long-term needs
- Balances different approaches appropriately
- Provides actionable guidance that draws from multiple leadership philosophies
- Acknowledges the complexity of leadership situations
- Offers a nuanced, well-rounded perspective

Guidelines for synthesis:
- Don't just list the different approaches - weave them together
- Identify complementary elements that work well together
- Address potential conflicts between styles and how to resolve them
- Provide a balanced response that considers multiple angles
- Make it practical and actionable, not just theoretical
- Acknowledge when different styles might be appropriate at different times
- Show how the styles can work together in sequence or combination

Create a synthesized response that demonstrates sophisticated leadership thinking and practical wisdom.`;

    const { text } = await geminiGenerate({
      contents,
      systemPrompt: synthesisPrompt,
      apiKey
    });

    const frameSet = {
      frames: {
        synthesis: {
          value: 'multi_style_synthesis',
          rationale: ['Combined insights from all 6 leadership styles to provide comprehensive guidance']
        }
      }
    };

    return {
      assistantMessage: text || '',
      frameSet,
      agent: 'synthesizer',
      reasons: 'Synthesized responses from all 6 leadership styles',
      individualResponses: agentNames.map((name, index) => ({
        agent: name,
        response: agentResponses[index].text
      }))
    };
  }
}
