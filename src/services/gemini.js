const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-3-flash-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export async function generateChatResponse(history) {
    if (!API_KEY) {
        throw new Error("Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to .env.local.");
    }

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: history,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Failed to generate response");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.error("Gemini API Error:", err);
        throw err;
    }
}

const GEMINI_MODEL = 'gemini-1.5-flash';

export async function getAiReflection(apiKey, thoughts) {
    if (!apiKey) throw new Error('Gemini API Key missing');
    if (!thoughts || thoughts.length === 0) throw new Error('No thoughts to reflect on');

    const prompt = `
        You are a supportive personal AI assistant. Below are a series of "Thought Dumps" from a user's private journal.
        Analyze these thoughts and provide a concise (3-4 bullet points) reflection on recurring patterns, 
        mental states, or interesting connections you notice. Keep it supportive, brief, and insightful.

        Thoughts:
        ${thoughts.map(t => `- [${t.created_at}] ${t.content}`).join('\n')}

        REFLECTION:
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini API Error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

export async function analyzeDecision(apiKey, activityName, activityDescription, globalContext = null) {
    if (!apiKey) throw new Error('Gemini API Key missing');
    
    // Format the Global Context for the AI
    let contextBlock = 'No global context available.';
    if (globalContext) {
        contextBlock = `
--- USER'S CURRENT STATE & SECOND BRAIN ---
**Active Life Goals:**
${globalContext.lifeGoals.length ? globalContext.lifeGoals.map(g => `- [${g.category}] ${g.title} (Priority: ${g.priority})`).join('\n') : 'None'}

**Financial Context:**
Accounts: ${globalContext.finance?.accounts?.map(a => `${a.name}: ${a.current_balance} ${a.currency}`).join(', ') || 'None'}
Budgets: ${globalContext.finance?.budgets?.map(b => `${b.category}: ${b.monthly_limit}/mo`).join(', ') || 'None'}
Financial Goals: ${globalContext.finance?.goals?.map(g => `${g.title}: ${g.current_amount}/${g.target_amount}`).join(', ') || 'None'}

**Mental State (Recent Journal Entries):**
${globalContext.journal.length ? globalContext.journal.map(j => `- [${j.date}] ${j.content?.substring(0, 200)}...`).join('\n') : 'None'}

**Active Habits & Discipline:**
${globalContext.habits.length ? globalContext.habits.map(h => `- ${h.name}`).join('\n') : 'None'}

**Active Tasks & Delegation:**
${globalContext.todos.length ? globalContext.todos.map(t => `- ${t.title}`).join('\n') : 'None'}
${globalContext.delegation.length ? globalContext.delegation.map(d => `- (Delegated) ${d.title}`).join('\n') : ''}

**Current Consumption & Knowledge (Recent):**
Reading/Watching: ${[...globalContext.bookmarks, ...globalContext.readingList, ...globalContext.watchlist].slice(0, 10).map(i => i.title).join(', ') || 'None'}
Studying/Writing: ${[...globalContext.studyNotes, ...globalContext.writing].slice(0, 10).map(i => i.title).join(', ') || 'None'}
-------------------------------------------
        `;
    }

    const prompt = `
You are a highly analytical, somewhat strict decision intelligence assistant. The user is considering a new activity or path.
Critically analyze this specific activity against their current life goals, financial situation, and overall mental state/workload. You must identify specific risks (like time sinks, dopamine traps, sunk cost fallacies, goal displacement, financial drain) tailored entirely to the exact activity they provided.

${contextBlock}

Activity to Analyze:
Name: ${activityName}
Description: ${activityDescription}

CRITICAL: DO NOT use generic stages or generic timelines. You MUST generate 3 to 5 custom, highly specific stages that describe the exact psychological and practical trajectory of THIS specific activity. 
For example, if the activity is "Modding Android ROMs", stages might be "XDA Browsing & Bootloader Unlocking", "Flashing & Brick Panic", "Kernel Tweaking Obsession", etc.
Do NOT use generic names like "Curiosity & Exploration" or "Active Engagement". Be brutally realistic about how this specific habit evolves.

RESPOND IN THIS EXACT JSON FORMAT (DO NOT ADD ANY MARKDOWN BACKTICKS OR EXTRA TEXT, JUST THE RAW JSON OBJECT):
{
  "verdict": "proceed" | "caution" | "avoid",
  "verdict_reason": "One specific sentence explaining why.",
  "time_investment": {
    "initial_phase": "Realistic time spent in the beginning",
    "if_hooked": "Realistic time if it becomes an obsession",
    "total_risk": "Cumulative time risk over months/years if left unchecked"
  },
  "stages": [
    {
      "stage_number": 1,
      "stage_name": "CUSTOM STAGE NAME SPECIFIC TO ACTIVITY",
      "duration": "Custom duration",
      "description": "Highly specific description of what happens here.",
      "warning_signs": ["Custom sign 1", "Custom sign 2"],
      "reversible": true
    }
  ],
  "goal_impact": [
    {
      "goal_title": "Existing Goal Title",
      "impact": "negative" | "neutral" | "positive",
      "explanation": "Specific reason how this new activity affects this goal."
    }
  ],
  "opportunity_cost": "Exactly what skills, projects, or health goals they are sacrificing by doing this.",
  "recommendation": "Detailed final recommendation with strict boundaries if they proceed."
}
`;

    // Using Groq API with llama3-70b-8192
    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Groq API Error');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}

export async function askDecisionFollowUp(apiKey, activityName, analysisJson, question, globalContext = null) {
    if (!apiKey) throw new Error('Groq API Key missing');

    // Format the Global Context for the AI
    let contextBlock = 'No global context available.';
    if (globalContext) {
        contextBlock = `
--- USER'S CURRENT STATE & SECOND BRAIN ---
**Active Life Goals:**
${globalContext.lifeGoals.length ? globalContext.lifeGoals.map(g => `- [${g.category}] ${g.title} (Priority: ${g.priority})`).join('\n') : 'None'}

**Financial Context:**
Accounts: ${globalContext.finance?.accounts?.map(a => `${a.name}: ${a.current_balance} ${a.currency}`).join(', ') || 'None'}
Budgets: ${globalContext.finance?.budgets?.map(b => `${b.category}: ${b.monthly_limit}/mo`).join(', ') || 'None'}
Financial Goals: ${globalContext.finance?.goals?.map(g => `${g.title}: ${g.current_amount}/${g.target_amount}`).join(', ') || 'None'}

**Mental State (Recent Journal Entries):**
${globalContext.journal.length ? globalContext.journal.map(j => `- [${j.date}] ${j.content?.substring(0, 200)}...`).join('\n') : 'None'}

**Active Habits & Discipline:**
${globalContext.habits.length ? globalContext.habits.map(h => `- ${h.name}`).join('\n') : 'None'}

**Active Tasks & Delegation:**
${globalContext.todos.length ? globalContext.todos.map(t => `- ${t.title}`).join('\n') : 'None'}
${globalContext.delegation.length ? globalContext.delegation.map(d => `- (Delegated) ${d.title}`).join('\n') : ''}

**Current Consumption & Knowledge (Recent):**
Reading/Watching: ${[...globalContext.bookmarks, ...globalContext.readingList, ...globalContext.watchlist].slice(0, 10).map(i => i.title).join(', ') || 'None'}
Studying/Writing: ${[...globalContext.studyNotes, ...globalContext.writing].slice(0, 10).map(i => i.title).join(', ') || 'None'}
-------------------------------------------
        `;
    }

    const prompt = `
You are a highly analytical decision intelligence assistant.
The user previously asked you to analyze this activity: "${activityName}".
Your analysis was:
${JSON.stringify(analysisJson, null, 2)}

${contextBlock}

The user now has a follow-up question:
"${question}"

Respond directly, concisely, and strictly in markdown format. Do not use JSON. Do not say you don't have access to their finances, the data is provided above.
`;

    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Groq API Error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
