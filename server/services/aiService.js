import openai from '../config/ai.js';
import { buildPrompt, buildChatContents } from './modeEngine.js';

const MODEL = 'gpt-4o-mini';

/**
 * Generic streaming function — uses the mode engine to pick the right system prompt.
 * Used for Type 1 (editor) modes — single-shot code analysis.
 */
export async function* streamByMode(code, language, mode, history = []) {
  const prompt = buildPrompt(mode, code, language);

  let messages = [];

  if (history && history.length > 0) {
    messages = history.map((msg, idx) => {
      if (idx === 0 && msg.role === 'user') {
        return {
          role: 'user',
          content: `${prompt}\n\nUser Request: ${msg.content}`
        };
      }
      return {
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      };
    });
  } else {
    messages = [{ role: 'user', content: prompt }];
  }

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: messages,
    stream: true,
    max_completion_tokens: 8000,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

/**
 * Chat streaming function with conversation history.
 * Used for Type 2 (chat) modes — multi-turn conversations.
 */
export async function* streamChatByMode(code, language, mode, history) {
  const messages = buildChatContents(mode, code, language, history);

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: messages,
    stream: true,
    max_completion_tokens: 8000,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

/**
 * Streams an AI roast of the given code.
 */
export async function* streamRoastCode(code, language) {
  const prompt = `
    You are Apollo, a hilarious, brutally honest, terribly sarcastic, but secretly a genuinely highly knowledgeable senior software engineer.
    Roast the following ${language || 'programming'} code mercilessly. Make fun of the terrible practices, bad naming, glaring inefficiency, and messy architecture.
    However, you MUST simultaneously provide incredibly helpful, constructive, and hyper-accurate advice on how exactly to improve it so the user actually learns. 
    Balance the savage comedy with extremely solid technical mentorship.
    Format your response beautifully in Markdown.

    Code to roast:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
  `;

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

/**
 * Streams an AI code review of the given code.
 */
export async function* streamCodeReview(code, language) {
  const prompt = `
    You are Apollo, a highly analytical, strict, and brilliant principal engineer.
    Carefully review the following ${language || 'programming'} code snippet. Identify any bugs, anti-patterns, missing edge-cases, and violations of clean code / SOLID principles.
    Explain the issues fundamentally and provide direct snippets of the refactored code.
    Format your response beautifully in Markdown.

    Code to review:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
  `;

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}


/**
 * Streams an AI explanation of the given code.
 */
export async function* streamExplanation(code, language) {
  const prompt = `
    You are Apollo, an expert AI coding tutor.
    Explain the following ${language || 'programming'} code clearly, step-by-step, to a beginner.
    Break down what the code does, any important syntax, and the overall purpose.
    Format your response in Markdown.

    Code to explain:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
  `;

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

/**
 * Streams an AI time and space complexity analysis of the given code.
 */
export async function* streamComplexity(code, language) {
  const prompt = `
    You are Apollo, an expert AI coding tutor.
    Analyze the time and space complexity of the following ${language || 'programming'} code.
    Provide the exact Big O notation for both time and space complexity at the very beginning, then briefly explain your reasoning step-by-step.
    Format your response in Markdown, using appropriate headers and bullet points.

    Code to analyze:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
  `;

  const responseStream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
  }
}

/**
 * Generates AI test cases as JSON.
 * Returns an array of test case objects.
 */
export async function generateTestsAsJson(code, language) {
  const prompt = `
    You are Apollo, an expert QA engineer and coding tutor.
    Analyze the following ${language || 'programming'} code and return a JSON object with a single key "tests" containing an array of exactly 3 test cases.
    
    Each object in the "tests" array must have:
    - "inputs": A string describing the inputs visually (e.g. "a = 1, b = 2")
    - "expectedOutput": A string of the EXACT expected printed output without quotes.
    - "fullExecutableCode": A complete, runnable source code file as a single string. It MUST include all standard imports/includes (e.g., #include <iostream>, import java.util.*), the user's FULL original code block intact, and the main driver loop (e.g., int main(), public static void main) that calls the function with the test case arguments and prints the expected output. This allows the backend to securely natively compile the string as a complete program snippet.

    Code to test:
    \`\`\`${language || ''}
    ${code}
    \`\`\`
  `;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: "json_object" }
  });

  let rawText = response.choices[0]?.message?.content || '{}';
  
  try {
     const parsed = JSON.parse(rawText);
     return parsed.tests || [];
  } catch {
     return [];
  }
}

