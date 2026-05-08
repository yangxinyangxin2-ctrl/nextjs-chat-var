import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const maxDuration = 60;

const API_KEY = process.env.API_KEY || '';
const BASE_URL = process.env.BASE_URL || '';
const MODEL = process.env.MODEL || '';

function getModelConfig(modelId: string): { apiKey: string; baseUrl: string; model: string } {
  for (let i = 1; i <= 10; i++) {
    const envModelId = process.env[`MODEL_${i}`];
    if (envModelId === modelId) {
      const apiKey = process.env[`API_KEY_${i}`];
      const baseUrl = process.env[`BASE_URL_${i}`];

      if (apiKey && baseUrl) {
        return {
          apiKey,
          baseUrl,
          model: modelId,
        };
      }
    }
  }

  if (API_KEY && BASE_URL) {
    return {
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      model: modelId || MODEL,
    };
  }

  throw new Error(
    `Model configuration not found for model: ${modelId}. Please configure API_KEY_* and BASE_URL_* environment variables.`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json({ error: 'Model ID is required in the request' }, { status: 400 });
    }

    const modelConfig = getModelConfig(model);

    const gateway = createOpenAICompatible({
      name: 'volcengine',
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseUrl,
    });

    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = streamText({
      model: gateway(modelConfig.model) as any,
      messages: formattedMessages,
      system: '你是一个乐于助人的助手，能够回答问题并帮助完成任务',
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
