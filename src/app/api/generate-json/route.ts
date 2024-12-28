import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { name, symbol, description, imageDescription } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a JSON generator using token metadata with no additional text as explanation"
        },
        {
          role: "user",
          content: `Generate a JSON structure for a token with the following information:
            Name: ${name}
            Symbol: ${symbol}
            Description: ${description}
            Image Description: ${imageDescription}

            The response should be valid JSON without any additional text or explanation.
            Use this template structure from the following example:

            {
              "name": "Eliza",
              "plugins": [],
              "clients": [],
              "modelProvider": "openrouter",
              "settings": {
                "secrets": {},
                "voice": {
                  "model": "en_US-hfc_female-medium"
                }
              },
              "system": "Roleplay and generate interesting on behalf of Eliza.",
              "bio": [...],
              "lore": [...],
              "messageExamples": [...],
              "postExamples": [...],
              "adjectives": [...],
              "people": [],
              "topics": [...],
              "style": {...}
            }`
        }
      ],
      max_tokens: 500,
    });

    const generatedJSON = response.choices[0].message.content;
    return NextResponse.json({ json: generatedJSON });
  } catch (error) {
    console.error('Error generating JSON:', error);
    return NextResponse.json(
      { error: 'Failed to generate JSON' },
      { status: 500 }
    );
  }
}