<script>
  import { onMount } from 'svelte';

  let input = '';
  let messages = [];
  let debugOpen = false;
  let replierInput = null; // { frameSet, contextCount, agent, reasons }
  let isLoading = false;
  let errorMsg = '';
  let useSynthesizer = false; // Toggle between router and synthesizer
  let showAgentSelection = false; // Show agent selection buttons
  let selectedAgentForDirect = null; // Agent selected for direct access
  let backgroundTransition = false; // Background color transition
  let targetBackgroundColor = null; // Target background color for transition
  let synthesizerCooldown = 0; // Cooldown timer for synthesizer (seconds)
  let synthesizerLastUsed = 0; // Timestamp of last synthesizer use
  let userApiKey = ''; // User-provided API key
  let showApiKeyInput = false; // Show/hide API key input
  let apiKeyValid = false; // Whether API key is valid
  let messageCount = 0; // Track number of messages sent
  let maxMessages = 5; // Maximum messages before refresh required

  // Color coding for each leadership style (original colors for UI, darker for background)
  const styleColors = {
    information_gatherer: { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', name: 'Information Gatherer', bgDark: '#1a1a1a' },
    coercive: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b', name: 'Crisis Commander', bgDark: '#2d1b1b' },
    authoritative: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', name: 'Visionary Leader', bgDark: '#1b2d3d' },
    affiliative: { bg: '#f0fdf4', border: '#86efac', text: '#166534', name: 'People Champion', bgDark: '#1b2d1b' },
    democratic: { bg: '#fef3c7', border: '#fde047', text: '#92400e', name: 'Consensus Builder', bgDark: '#2d2d1b' },
    pacesetting: { bg: '#f3e8ff', border: '#c4b5fd', text: '#7c3aed', name: 'High Performer', bgDark: '#2d1b3d' },
    coaching: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', name: 'Mentor', bgDark: '#1b2d2d' },
    synthesizer: { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', name: 'Leadership Synthesizer', bgDark: '#1a1a1a' }
  };


  onMount(() => {
    // Set initial background to black
    document.body.style.setProperty('--target-bg', '#000000');

    // Load saved API key
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
      userApiKey = savedKey;
      apiKeyValid = true;
    }

    // Start cooldown timer
    setInterval(() => {
      if (synthesizerCooldown > 0) {
        synthesizerCooldown--;
      }
    }, 1000);
  });

  // Update body class and CSS variable when background transition changes
  $: if (backgroundTransition && targetBackgroundColor) {
    document.body.classList.add('background-transition');
    document.body.style.setProperty('--target-bg', targetBackgroundColor);
  }

  // Track current style for input tinting
  $: currentStyle = replierInput?.agent ? styleColors[replierInput.agent] : null;

  // Agent selection data
  const agentOptions = [
    { id: 'coaching', name: 'Mentor', description: 'For development and growth', icon: '🌱' },
    { id: 'authoritative', name: 'Visionary Leader', description: 'For strategy and inspiration', icon: '🎯' },
    { id: 'affiliative', name: 'People Champion', description: 'For team building and relationships', icon: '🤝' },
    { id: 'democratic', name: 'Consensus Builder', description: 'For collaboration and input', icon: '🗳️' },
    { id: 'pacesetting', name: 'High Performer', description: 'For excellence and standards', icon: '🏆' },
    { id: 'coercive', name: 'Crisis Commander', description: 'For emergencies and urgent situations', icon: '⚡' }
  ];

  async function send() {
    const content = input.trim();
    if (!content) return;

    // Check message limit for demo mode (no user API key)
    if (!apiKeyValid && messageCount >= maxMessages) {
      errorMsg = `Demo limit reached (${maxMessages} messages). Please add your API key to continue or refresh the page to restart.`;
      return;
    }

    // Check synthesizer cooldown
    if (useSynthesizer && !canUseSynthesizer()) {
      errorMsg = `Synthesizer is on cooldown. Please wait ${synthesizerCooldown} seconds before using it again.`;
      return;
    }

    messages = [...messages, { role: 'user', content }];
    input = '';
    isLoading = true;
    errorMsg = '';

    // Increment message count for demo mode
    if (!apiKeyValid) {
      messageCount++;
    }

    const endpoint = useSynthesizer ? '/api/chat-synthesizer' : '/api/chat';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: messages,
        apiKey: apiKeyValid ? userApiKey : null
      })
    });
    const data = await res.json();
    if (!res.ok || data?.error) {
      errorMsg = data?.error || 'Request failed';
      isLoading = false;
      return;
    }
    if (data.assistantMessage) {
      const agent = data.replierInput?.agent || 'synthesizer';
      const styleInfo = styleColors[agent] || styleColors.synthesizer;
      const processedMessage = checkForAgentSelection(data.assistantMessage);
      messages = [...messages, {
        role: 'assistant',
        content: processedMessage,
        styleName: styleInfo.name,
        styleColor: styleInfo
      }];
      replierInput = data.replierInput || null;

      // Start background transition
      startBackgroundTransition(agent);

      // Start cooldown if synthesizer was used
      if (useSynthesizer) {
        startSynthesizerCooldown();
      }
    }
    isLoading = false;
  }

  async function selectAgent(agentId) {
    selectedAgentForDirect = agentId;
    showAgentSelection = false;

    // Start background transition immediately
    startBackgroundTransition(agentId);

    // Add a message indicating the agent selection
    const agentInfo = styleColors[agentId];
    messages = [...messages, {
      role: 'user',
      content: `I want to speak to the ${agentInfo.name}`,
      styleName: agentInfo.name,
      styleColor: agentInfo
    }];

    // Send request immediately
    isLoading = true;
    errorMsg = '';

    const endpoint = useSynthesizer ? '/api/chat-synthesizer' : '/api/chat';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: messages,
        apiKey: apiKeyValid ? userApiKey : null
      })
    });

    const data = await res.json();
    if (!res.ok || data?.error) {
      errorMsg = data?.error || 'Request failed';
      isLoading = false;
      return;
    }

    if (data.assistantMessage) {
      const agent = data.replierInput?.agent || agentId;
      const styleInfo = styleColors[agent] || styleColors[agentId];
      const processedMessage = checkForAgentSelection(data.assistantMessage);
      messages = [...messages, {
        role: 'assistant',
        content: processedMessage,
        styleName: styleInfo.name,
        styleColor: styleInfo
      }];
      replierInput = data.replierInput || null;

      // Start background transition
      startBackgroundTransition(agent);

      // Start cooldown if synthesizer was used
      if (useSynthesizer) {
        startSynthesizerCooldown();
      }
    }

    isLoading = false;
  }

  function checkForAgentSelection(message) {
    if (message.includes('<AGENT_SELECTION>') && message.includes('</AGENT_SELECTION>')) {
      showAgentSelection = true;
      return message.replace(/<AGENT_SELECTION>.*?<\/AGENT_SELECTION>/g, '');
    }
    return message;
  }


  function startBackgroundTransition(agentId) {
    if (agentId === 'information_gatherer') {
      // Keep black background for information gatherer
      targetBackgroundColor = '#000000';
    } else {
      // Use agent's dark background color for page background
      targetBackgroundColor = styleColors[agentId]?.bgDark || '#0f172a';
    }
    backgroundTransition = true;
  }

  function canUseSynthesizer() {
    return synthesizerCooldown === 0;
  }

  function startSynthesizerCooldown() {
    synthesizerCooldown = 60; // 60 seconds cooldown
    synthesizerLastUsed = Date.now();
  }

  function toggleApiKeyInput() {
    showApiKeyInput = !showApiKeyInput;
    if (!showApiKeyInput) {
      userApiKey = '';
      apiKeyValid = false;
    }
  }

  async function validateApiKey() {
    if (!userApiKey.trim()) {
      errorMsg = 'Please enter a valid API key';
      return;
    }

    try {
      // Test the API key with a simple request
      const testResponse = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: userApiKey.trim() })
      });

      if (testResponse.ok) {
        apiKeyValid = true;
        showApiKeyInput = false;
        errorMsg = '';
        messageCount = 0; // Reset message count when API key is added
        // Store in localStorage for session persistence
        localStorage.setItem('geminiApiKey', userApiKey.trim());
      } else {
        const error = await testResponse.json();
        errorMsg = error.error || 'Invalid API key';
        apiKeyValid = false;
      }
    } catch (err) {
      errorMsg = 'Failed to validate API key. Please check your connection.';
      apiKeyValid = false;
    }
  }

  function clearApiKey() {
    userApiKey = '';
    apiKeyValid = false;
    messageCount = 0; // Reset message count when clearing API key
    localStorage.removeItem('geminiApiKey');
    errorMsg = '';
  }

  function refreshPage() {
    window.location.reload();
  }

</script>

<style>
  :global(:root) {
    --bg: #0f172a;
    --bg-grad-a: #0b1223;
    --bg-grad-b: #111827;
    --card: #ffffff;
    --card-muted: #f8fafc;
    --border: #e5e7eb;
    --text: #0f172a;
    --muted: #64748b;
    --primary: #2563eb;
    --primary-600: #1d4ed8;
  }

  :global(html, body) {
    height: 100%;
    margin: 0;
    background: #000000;
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
    transition: background 3s ease-in-out;
  }

  :global(body.background-transition) {
    background: var(--target-bg, #000000) !important;
    transition: background 3s ease-in-out !important;
  }

  :global(*), :global(*::before), :global(*::after) { box-sizing: border-box; }

  .container { max-width: 960px; margin: 2.5rem auto; padding: 0 1rem; }

  h1 { color: #e5ebff; letter-spacing: 0.2px; margin: 0 0 0.25rem 0; font-weight: 650; }
  .subtle { color: #a5b4fc; font-size: 0.95rem; margin-bottom: 0.75rem; }

  .row { display: flex; gap: 0.5rem; align-items: center; }
  .chat {
    border-radius: 12px;
    padding: 1rem;
    min-height: 320px;
    max-height: 800px; /* enable scroll beyond 800px */
    overflow-y: auto;
    background: var(--card);
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(2,6,23,0.12);
    -webkit-overflow-scrolling: touch;
  }
  .flexcol { display: flex; flex-direction: column; gap: 0.35rem; }
  .bubble { padding: 0.65rem 0.85rem; border-radius: 12px; margin: 0.25rem 0; max-width: 80%; white-space: pre-wrap; line-height: 1.4; }
  .user { background: #e8f0ff; color: #0b1a3a; align-self: flex-end; border: 1px solid #c7d2fe; }
  .assistant { background: #f5f7fb; color: #0f172a; align-self: flex-start; border: 1px solid #e5e7eb; }
  .bubble:hover { outline: 2px solid transparent; box-shadow: 0 1px 0 rgba(2,6,23,0.04); }
  .meta { color: var(--muted); font-size: 0.8rem; margin-bottom: 0.15rem; }

  .toolbar { display: flex; gap: 1rem; align-items: center; justify-content: space-between; margin: 0.75rem 0; }

  input[type="text"] {
    padding: 0.6rem 0.7rem; border-radius: 10px; border: 1px solid var(--border); background: var(--card);
    outline: none; transition: border-color .15s ease, box-shadow .15s ease;
  }
  input[type="text"]:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }

  :global(button) { padding: 0.55rem 0.9rem; border: 1px solid transparent; border-radius: 10px; background: var(--primary); color: white; cursor: pointer; font-weight: 550; }
  :global(button:hover) { background: var(--primary-600); }
  :global(button.secondary) { background: var(--card); color: var(--text); border-color: var(--border); }
  :global(button.secondary:hover) { background: var(--card-muted); }

  .debug { background: var(--card); border: 1px dashed var(--border); padding: 0.75rem; margin-top: 0.75rem; border-radius: 10px; box-shadow: 0 2px 14px rgba(2,6,23,0.06);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.85rem; }

  .error {
    background: #fff1f2;
    color: #7f1d1d;
    border: 1px solid #fecaca;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    margin: 0.5rem 0 0.75rem 0;
  }

  .typing { display: inline-flex; gap: 6px; align-items: center; }
  .dot { width: 7px; height: 7px; background: #a3aab8; border-radius: 50%; animation: blink 1.4s infinite both; }
  .dot:nth-child(2) { animation-delay: .2s; }
  .dot:nth-child(3) { animation-delay: .4s; }
  @keyframes blink { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }

  .agent-selection {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  .agent-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 800px;
    padding: 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.5s ease-out;
  }

  .agent-button {
    padding: 1.5rem;
    border: 2px solid transparent;
    border-radius: 12px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .agent-button:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  .agent-button:active {
    transform: translateY(-2px);
  }

  .agent-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    display: block;
  }

  .agent-name {
    font-weight: 600;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
    color: #1e293b;
  }

  .agent-description {
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.4;
  }


  .background-color-transition {
    animation: backgroundColorChange 0.8s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }


  @keyframes backgroundColorChange {
    0% { background: rgba(0, 0, 0, 0.8); }
    100% { background: var(--selected-bg, rgba(0, 0, 0, 0.8)); }
  }


  @media (max-width: 640px) {
    .bubble { max-width: 92%; }
    .toolbar { gap: 0.5rem; }
    .container { margin: 1.25rem auto; }
    .agent-grid {
      grid-template-columns: 1fr;
      padding: 1rem;
      margin: 1rem;
    }
  }
</style>

<div class="container">
  <h1>Leadership Style Advisor</h1>
  <div class="subtle">Get comprehensive leadership guidance. Start by describing your situation, then request specific leadership styles when needed.</div>
  <div class="toolbar" style="margin: 0.5rem 0 0.75rem 0;">
    <button class="secondary" on:click={() => (debugOpen = !debugOpen)}>{debugOpen ? 'Hide' : 'Show'} Debug</button>
    <button class="secondary" on:click={() => (showAgentSelection = true)}>Skip Questions & Choose Leader</button>
    <button class="secondary" on:click={toggleApiKeyInput}>
      {apiKeyValid ? '🔑 API Key Set' : '🔑 Add API Key'}
    </button>
    <label style="display: flex; align-items: center; gap: 0.5rem; color: #a5b4fc;">
      <input type="checkbox" bind:checked={useSynthesizer} disabled={!canUseSynthesizer()} />
      Use Synthesizer (combines all 6 styles)
      {#if synthesizerCooldown > 0}
        <span style="color: #fca5a5; font-size: 0.8rem; margin-left: 0.5rem;">
          (Cooldown: {synthesizerCooldown}s)
        </span>
      {/if}
    </label>
  </div>

  {#if showApiKeyInput}
    <div class="api-key-section" style="margin: 1rem 0; padding: 1rem; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
      <h3 style="color: #e2e8f0; margin: 0 0 0.5rem 0; font-size: 1rem;">Add Your Gemini API Key</h3>
      <p style="color: #94a3b8; font-size: 0.9rem; margin: 0 0 1rem 0;">
        To use the full functionality, enter your own Gemini API key. This will be stored locally in your browser.
      </p>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <input
          type="password"
          bind:value={userApiKey}
          placeholder="Enter your Gemini API key..."
          style="flex: 1; padding: 0.6rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #e2e8f0;"
        />
        <button class="primary" on:click={validateApiKey} disabled={!userApiKey.trim()}>
          Validate
        </button>
        <button class="secondary" on:click={toggleApiKeyInput}>
          Cancel
        </button>
      </div>
      <p style="color: #64748b; font-size: 0.8rem; margin: 0.5rem 0 0 0;">
        Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #60a5fa;">Google AI Studio</a>
      </p>
    </div>
  {/if}

  {#if apiKeyValid}
    <div class="api-key-status" style="margin: 0.5rem 0; padding: 0.5rem; background: #065f46; border-radius: 6px; border: 1px solid #10b981;">
      <div style="display: flex; align-items: center; gap: 0.5rem; color: #d1fae5;">
        <span>✅</span>
        <span style="font-size: 0.9rem;">Using your API key - full functionality enabled</span>
        <button class="secondary" on:click={clearApiKey} style="margin-left: auto; font-size: 0.8rem; padding: 0.25rem 0.5rem;">
          Clear
        </button>
      </div>
    </div>
  {:else}
    <div class="demo-mode" style="margin: 0.5rem 0; padding: 0.5rem; background: #92400e; border-radius: 6px; border: 1px solid #f59e0b;">
      <div style="display: flex; align-items: center; gap: 0.5rem; color: #fef3c7;">
        <span>⚠️</span>
        <span style="font-size: 0.9rem;">
          Demo mode - {messageCount}/{maxMessages} messages used
          {#if messageCount >= maxMessages}
            (Limit reached - add API key to continue)
          {:else}
            (Add your API key for unlimited messages)
          {/if}
        </span>
        <div style="margin-left: auto; display: flex; gap: 0.5rem;">
          <button class="secondary" on:click={toggleApiKeyInput} style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
            Add Key
          </button>
          {#if messageCount >= maxMessages}
            <button class="secondary" on:click={refreshPage} style="font-size: 0.8rem; padding: 0.25rem 0.5rem; background: #dc2626; color: white;">
              Refresh
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if errorMsg}
    <div class="error" role="alert">
      {errorMsg}
    </div>
  {/if}

  <div class="chat flexcol">
    {#each messages as m, i}
      <div class="bubble {m.role}" style:background-color={m.role === 'assistant' && m.styleColor ? m.styleColor.bg : (m.role === 'user' ? '#e8f0ff' : '#f5f7fb')} style:border-color={m.role === 'assistant' && m.styleColor ? m.styleColor.border : (m.role === 'user' ? '#c7d2fe' : '#e5e7eb')} style:color={m.role === 'assistant' && m.styleColor ? m.styleColor.text : '#0f172a'}>
        <div class="meta">{m.role === 'assistant' && m.styleName ? m.styleName : m.role}</div>
        <div>{m.content}</div>
      </div>
    {/each}
    {#if isLoading}
      <div class="bubble assistant" style:background-color="#f5f7fb" style:border-color="#e5e7eb" style:color="#0f172a">
        <div class="meta">analyzing...</div>
        <div class="typing" aria-label="Assistant is typing">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    {/if}
  </div>

  <div class="row" style="margin-top: 0.75rem;">
    <input type="text"
      placeholder={currentStyle ? `Ask ${currentStyle.name}...` : "Type a message..."}
      bind:value={input}
      on:keydown={(e) => e.key === 'Enter' && send()}
      disabled={isLoading || (!apiKeyValid && messageCount >= maxMessages)}
      style="flex: 1; padding: 0.6rem; border-radius: 6px; border: 1px solid {currentStyle ? currentStyle.border : '#ddd'}; background-color: {currentStyle ? currentStyle.bg : 'white'}; color: {currentStyle ? currentStyle.text : '#0f172a'};"
    />
    <button on:click={send} disabled={isLoading || (!apiKeyValid && messageCount >= maxMessages)}>Send</button>
  </div>

</div>

{#if debugOpen}
  <div class="debug">
    <div><strong>Messages:</strong> {messages.length}</div>
    {#if replierInput}
      <div style="margin-top: 0.5rem;">
        <div><strong>Context Count:</strong> {replierInput.contextCount}</div>
        <div><strong>Agent:</strong> {replierInput.agent || 'n/a'}</div>
        <div><strong>Reason:</strong> {replierInput.reasons || 'n/a'}</div>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin-top: 0.35rem;">
          {#each Object.entries(replierInput.frameSet?.frames || {}) as [name, p]}
            <div><strong>{name}</strong>: {p?.value}</div>
          {/each}
        </div>
        {#if replierInput.individualResponses}
          <div style="margin-top: 0.75rem;">
            <div><strong>Individual Agent Responses:</strong></div>
            {#each replierInput.individualResponses as response}
              <div style="margin-top: 0.5rem; padding: 0.5rem; background: #f8fafc; border-radius: 6px; font-size: 0.85rem;">
                <div><strong>{response.agent}:</strong></div>
                <div style="margin-top: 0.25rem; color: #64748b;">{response.response}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

{#if showAgentSelection}
  <div class="agent-selection" style:background="rgba(0, 0, 0, 0.8)" on:click={(e) => e.target === e.currentTarget && (showAgentSelection = false)}>
    <div class="agent-grid">
      <div style="grid-column: 1 / -1; text-align: center; margin-bottom: 1rem;">
        <h2 style="margin: 0 0 0.5rem 0; color: #1e293b;">Choose Your Leadership Style</h2>
        <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Select the leadership approach that best fits your situation</p>
      </div>
      {#each agentOptions as agent}
        <button
          class="agent-button"
          on:click={() => selectAgent(agent.id)}
          style:background-color={styleColors[agent.id]?.bg}
          style:border-color={styleColors[agent.id]?.border}
          style:color={styleColors[agent.id]?.text}
        >
          <span class="agent-icon">{agent.icon}</span>
          <div class="agent-name">{agent.name}</div>
          <div class="agent-description">{agent.description}</div>
        </button>
      {/each}
      <div style="grid-column: 1 / -1; text-align: center; margin-top: 1rem;">
        <button class="secondary" on:click={() => (showAgentSelection = false)} style="font-size: 0.9rem;">Cancel</button>
      </div>
    </div>
  </div>
{/if}
