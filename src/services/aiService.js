/**
 * aiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Communicates with the Google Gemini API to power the Luna AI Assistant.
 * Uses the standard REST API to avoid bulky dependencies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function askLuna(prompt, systemContext = "") {
    if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
        throw new Error("Groq API key is missing. Please add VITE_GROQ_API_KEY to your .env file.");
    }

    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const requestBody = {
        model: 'llama-3.1-8b-instant', // Updated to supported Groq model
        messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Luna API Error: ${response.status} - ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
