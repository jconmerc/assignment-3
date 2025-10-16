# Leadership Style Advisor Chatbot

A multi-agent chatbot that provides leadership guidance based on 6 distinct leadership styles from Goleman's research. The system includes both a router (selects single best style) and a synthesizer (combines all styles) approach.

## Leadership Styles

### 1. Coercive Agent - "Crisis Commander"
- **When to use**: Emergencies, disasters, turnarounds, or dealing with problematic individuals
- **Approach**: "Do as I say" - demands immediate compliance
- **Best for**: Crisis situations requiring urgent action
- **Risks**: Kills creativity and motivation in normal circumstances

### 2. Authoritative Agent - "Visionary Leader"
- **When to use**: Times of internal crisis, when defining a vision, or when organization is adrift
- **Approach**: "Come with me" - mobilizes people toward a vision
- **Best for**: Providing clear direction and inspiring change
- **Risks**: Fails when working with more experienced experts

### 3. Affiliative Agent - "People Champion"
- **When to use**: Building organizations, healing wounds, increasing morale, improving communication
- **Approach**: "People come first" - creates emotional bonds and harmony
- **Best for**: Team building and relationship-focused situations
- **Risks**: May allow poor performance to go uncorrected

### 4. Democratic Agent - "Consensus Builder"
- **When to use**: Generating ideas, building consensus, or when leader is uncertain about direction
- **Approach**: Builds consensus through participation
- **Best for**: When you need input from competent team members
- **Risks**: Can lead to endless meetings and confusion

### 5. Pacesetting Agent - "High Performer"
- **When to use**: Leading highly skilled, self-motivated professionals who need little direction
- **Approach**: Leads by dynamic example with extremely high standards
- **Best for**: Excellence-driven environments with competent teams
- **Risks**: Can intimidate and overwhelm employees

### 6. Coaching Agent - "Mentor"
- **When to use**: Developing individuals who are aware of their needs and receptive to support
- **Approach**: Develops people for the future through mentoring
- **Best for**: Long-term development and growth
- **Risks**: Requires time and commitment; fails with resistant employees

## Two Orchestration Approaches

### Router (Default)
- **File**: `src/lib/orchestrators/LeadershipRouter.js`
- **Endpoint**: `/api/chat`
- **Function**: Selects the single most appropriate leadership style for the situation
- **Use case**: When you want focused, specific guidance from one style

### Synthesizer
- **File**: `src/lib/orchestrators/LeadershipSynthesizer.js`
- **Endpoint**: `/api/chat-synthesizer`
- **Function**: Combines insights from all 6 leadership styles
- **Use case**: When you want comprehensive, balanced guidance

## Usage

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Access the chatbot** at `http://localhost:5173`

3. **Toggle between modes**:
   - Unchecked: Uses Router (selects single best style)
   - Checked: Uses Synthesizer (combines all styles)

4. **Ask leadership questions** like:
   - "My team is in crisis and I need to make quick decisions"
   - "How do I build better relationships with my team?"
   - "My organization is adrift and needs direction"
   - "I need to develop my team members for the future"

## File Structure

```
src/
├── lib/
│   ├── agents/
│   │   ├── CoerciveAgent.js          # Crisis Commander
│   │   ├── AuthoritativeAgent.js     # Visionary Leader
│   │   ├── AffiliativeAgent.js       # People Champion
│   │   ├── DemocraticAgent.js        # Consensus Builder
│   │   ├── PacesettingAgent.js       # High Performer
│   │   └── CoachingAgent.js          # Mentor
│   └── orchestrators/
│       ├── LeadershipRouter.js       # Selects single best style
│       └── LeadershipSynthesizer.js  # Combines all styles
└── routes/
    ├── api/
    │   ├── chat/+server.js           # Router endpoint
    │   └── chat-synthesizer/+server.js # Synthesizer endpoint
    └── +page.svelte                  # Main UI
```

## System Prompts

Each agent uses Hymes' SPEAKING model for their system prompts:
- **Setting**: The context and environment
- **Participants**: The roles and relationships
- **Ends**: The goals and objectives
- **Act Sequence**: The communication flow
- **Key**: The core personality traits
- **Instrumentalities**: The communication style and tools
- **Norms**: The behavioral rules and expectations
- **Genre**: The response style and approach

## Development Notes

- All agents are based on Goleman's research from "Leadership That Gets Results"
- The system uses Gemini AI for generating responses
- Each agent has a distinct personality and communication style
- The orchestrators use different approaches to combine agent responses
- Debug mode shows which agent was selected and why
