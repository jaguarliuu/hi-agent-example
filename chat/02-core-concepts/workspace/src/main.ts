import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig } from './config.js';
import { createModel } from './model-provider.js';
import { OpenAiChatClient } from './chat-client.js';
import { OpenAiChatSession } from './chat-session.js';

// @anchor:main-entry
async function main() {
  const config = loadConfig();
  const model = createModel(config);
  const client = new OpenAiChatClient(model);
  const session = new OpenAiChatSession(client);
  const terminal = createInterface({ input, output });

  console.log('Chat started. Type "exit" to quit.');

  try {
    while (true) {
      const line = await terminal.question('You: ');
      const userInput = line.trim();

      if (!userInput) continue;
      if (userInput === 'exit') break;

      try {
        await writeOutput('AI: ');
        await session.sendStreaming(userInput, (delta) => {
          return writeOutput(delta);
        });
        await writeOutput('\n');
      } catch (error) {
        console.error(`AI error: ${formatError(error)}`);
      }
    }
  } finally {
    terminal.close();
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeOutput(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    output.write(text, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

main().catch((error) => {
  console.error(`Failed to start chat: ${formatError(error)}`);
  process.exitCode = 1;
});
