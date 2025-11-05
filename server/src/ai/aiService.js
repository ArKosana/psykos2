import fetch from 'node-fetch';

class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async chat(messages, temperature = 0.8, max_tokens = 120) {
    if (!this.apiKey) return null;
    const res = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages, temperature, max_tokens
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  }

  clean(text) {
    return (text || '')
      .replace(/^[^:]+:\s*/, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim();
  }

  async generateQuestion(category, playerNames = []) {
    const prompts = {
      'ice-breaker': `Generate a short, fun get-to-know-you question. Return ONLY the question.`,
      'search-history': `Generate a funny search query beginning, like "why do cats..." Return ONLY the fragment.`,
      'truth-comes-out': `Create a personal question about a random player: ${playerNames.join(', ')}. Return ONLY the question.`,
      'naked-truth': `Create an 18+ personal question about a random player: ${playerNames.join(', ')}. Return ONLY the question.`,
      'who-among-us': `Create a "Who among us is most likely to..." question. Return ONLY the question.`,
      'ridleys-think-fast': `Create a simple, answerable prompt that can be answered in under 5 seconds. Examples: "Name a fruit", "Say a color". Return ONLY the prompt.`
    };
    const system = `You make short, fun party game prompts. Return ONLY the prompt, no labels.`;
    const user = prompts[category] || `Generate a short prompt for a party game.`;
    const text = await this.chat([{role:'system', content: system},{role:'user', content: user}], 0.7, 80);
    return this.clean(text) || 'Say something funny.';
  }

  async generateAcronymPair() {
    if (!this.apiKey) {
      return { acronym: 'NASA', expansion: 'National Aeronautics and Space Administration' };
    }
    const system = `Return ONLY JSON like {"acronym":"NASA","expansion":"National Aeronautics and Space Administration"}`;
    const user = `Provide a well-known acronym and its correct expansion.`;
    const text = await this.chat([{role:'system',content:system},{role:'user',content:user}], 0.6, 80);
    try {
      const j = JSON.parse(text);
      if (j?.acronym && j?.expansion) return j;
    } catch {}
    if (text?.includes('-')) {
      const [a,b] = text.split('-');
      return { acronym: (a||'NASA').trim(), expansion: (b||'National Aeronautics and Space Administration').trim() };
    }
    return { acronym: 'NASA', expansion: 'National Aeronautics and Space Administration' };
  }

  async trueFactFor(word) {
    if (!this.apiKey) return `Pigs are highly intelligent animals.`;
    const system = `Return ONLY one short true sentence about the provided word.`;
    const user = `Give a short true fact about "${word}".`;
    const text = await this.chat([{role:'system',content:system},{role:'user',content:user}], 0.5, 60);
    return this.clean(text) || `Pigs are highly intelligent animals.`;
  }

  async gradeCloseness(question, answers, correctAnswer) {
    if (!this.apiKey) return Array(answers.length).fill(5);
    const sys = `You grade answers from 1-10 for closeness to the correct answer. Return ONLY comma-separated numbers.`;
    const prompt = `Question: "${question}"\nCorrect: "${correctAnswer}"\nAnswers:\n${answers.map((a,i)=>`${i+1}. "${a}"`).join('\n')}`;
    const text = await this.chat([{role:'system', content: sys}, {role:'user', content: prompt}], 0.3, 60);
    const scores = (text||"").split(',').map(s=>parseInt(s.trim(),10)).map(n=> isNaN(n)?5: Math.min(10,Math.max(1,n)));
    return scores.length ? scores : Array(answers.length).fill(5);
  }
}

export default new AIService();
