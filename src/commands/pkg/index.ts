import { resolve } from 'node:path';
import { Command } from 'commander';
import { concatFiles } from './concatFiles.js';
import type { CommandOptions, ProcessResult } from '../../types.js';

class PkgCommand extends Command {
    constructor() {
        super('pkg');
        this
            .description('Concatenate files while respecting ignore patterns')
            .option('-d, --dest <path>', 'destination path for output', 'notebooklm')
            .option('-s, --source <path>', 'source directory to process', process.cwd())
            .option('-v, --verbose', 'show detailed execution information', false)
            .option('-o, --output <type>', 'output format (text/json)', 'text')
            .action(async (options: CommandOptions) => {
                try {
                    const sourcePath = resolve(options.source);
                    const destPath = resolve(options.dest);

                    const result = await concatFiles(destPath, sourcePath, options.verbose);

                    if (options.verbose) {
                        this.displayVerboseOutput(result);
                    }

                    if (options.output === 'json') {
                        process.stdout.write(JSON.stringify(result));
                    } else {
                        console.log(`Files concatenated successfully from ${sourcePath} to ${destPath}`);
                        if (result.staticFiles.length > 0) {
                            console.log(`${result.staticFiles.length} static files copied to static/ directory`);
                        }
                    }
                } catch (error) {
                    console.error('Error:', error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            });
    }

    private displayVerboseOutput(result: ProcessResult): void {
        console.log('\nExecution Summary:');
        console.log('----------------');
        console.log(`Total files processed: ${result.totalFiles}`);
        console.log(`Successfully processed: ${result.successful.length}`);
        console.log(`Failed to process: ${result.failed.length}`);
        console.log(`Static files copied: ${result.staticFiles.length}`);

        if (result.staticFiles.length > 0) {
            console.log('\nStatic files:');
            result.staticFiles.forEach(({ original, copied }) => {
                console.log(`- ${original} → ${copied}`);
            });
        }

        if (result.failed.length > 0) {
            console.log('\nFailed files:');
            result.failed.forEach(({ file, error }) => {
                console.error(`- ${file}: ${error}`);
            });
        }
    }
}

export default new PkgCommand(); 