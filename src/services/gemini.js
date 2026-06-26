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
