import { Command } from 'commander';

export abstract class BaseCommand extends Command {
    constructor(name: string) {
        super(name);
        this.option('-v, --verbose', 'show detailed execution information', false)
            .option('-o, --output <type>', 'output format (text/json)', 'text');
    }

    protected displayJsonOutput(data: unknown): void {
        process.stdout.write(JSON.stringify(data));
    }

    protected displayError(error: Error | unknown): void {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    protected verboseLog(message: string): void {
        if (this.opts().verbose) {
            console.log(message);
        }
    }

    // Force implementing classes to define these methods
    abstract execute(options: unknown): Promise<void>;
    abstract displayResults(result: unknown, options: unknown): void;
} 