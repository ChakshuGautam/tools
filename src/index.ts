#!/usr/bin/env bun
import { Command } from 'commander';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'url';

class CLI extends Command {
    constructor() {
        super();
        this.name('tools')
            .description('CLI tools for local development workflow')
            .version('1.0.0');

        this.loadCommands().catch(error => {
            console.error('Failed to load commands:', error);
            process.exit(1);
        });
    }

    private async loadCommands(): Promise<void> {
        const __dirname = fileURLToPath(new URL('.', import.meta.url));
        const commandsDir = join(__dirname, 'commands');

        const commands = readdirSync(commandsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const cmd of commands) {
            try {
                const { default: command } = await import(`./commands/${cmd}/index.js`);
                this.addCommand(command);
            } catch (error) {
                console.warn(`Failed to load command ${cmd}:`, error instanceof Error ? error.message : String(error));
            }
        }

        this.parse();
    }
}

new CLI(); 