import { ProcessEnvReader } from '@ai-playbook-engine/config';
import { runCli } from './run-cli.js';

const io = {
  writeStdout(value: string): void {
    process.stdout.write(value);
  },
  writeStderr(value: string): void {
    process.stderr.write(value);
  },
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const envReader = new ProcessEnvReader();
  process.exitCode = await runCli(argv, envReader, io);
}

await main();
