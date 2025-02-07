import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { readdir, createTestFiles } from './helpers';
import PkgCommand from '../index';

const TEST_DIR = join(process.cwd(), 'src/commands/pkg/__tests__/test-repo');
const OUTPUT_FILE = 'output.txt';

describe('pkg command', () => {
    beforeEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
        await rm(OUTPUT_FILE, { force: true });
        await rm('static', { recursive: true, force: true });
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
        await rm(OUTPUT_FILE, { force: true });
        await rm('static', { recursive: true, force: true });
    });

    test('should concatenate text files and handle static files', async () => {
        const files = {
            'src/index.js': 'console.log("Hello World");',
            'src/utils/helper.js': 'export const add = (a, b) => a + b;',
            'assets/image.png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
            'docs/document.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46])
        };

        await createTestFiles(TEST_DIR, files);

        await PkgCommand.parseAsync(['node', 'pkg', 
            '--source', TEST_DIR,
            '--dest', OUTPUT_FILE,
            '--verbose'
        ]);

        const output = await readFile(OUTPUT_FILE, 'utf-8');
        
        // Verify text files
        expect(output).toContain('// File: src/index.js');
        expect(output).toContain('console.log("Hello World")');
        expect(output).toContain('// File: src/utils/helper.js');
        
        // Verify static files
        const staticFiles = await readdir(join(process.cwd(), 'static'));
        expect(staticFiles).toContain('assets_image.png');
        expect(staticFiles).toContain('docs_document.pdf');
    });

    test('should respect ignore patterns', async () => {
        // Create ignore file first
        await writeFile(
            join(TEST_DIR, '.notebooklmignore'),
            `# Test files
*.test.js
# Ignored directory
src/ignored/**
# Temp files
temp.*`
        );

        const files = {
            // These should be included
            'src/index.js': 'valid file',
            'src/valid.js': 'should be kept',
            
            // These should be ignored
            'src/test.test.js': 'should be ignored',
            'src/ignored/file.js': 'should be ignored',
            'src/temp.js': 'should be ignored'
        };

        await createTestFiles(TEST_DIR, files);

        await PkgCommand.parseAsync(['node', 'pkg',
            '--source', TEST_DIR,
            '--dest', OUTPUT_FILE,
            '--verbose'
        ]);

        const output = await readFile(OUTPUT_FILE, 'utf-8');
        
        // Extract all processed file paths from the output
        const processedFiles = output.match(/\/\/ File: ([^\n]+)/g)
            ?.map(line => line.replace('// File: ', ''))
            ?? [];
        
        // Check included files
        expect(processedFiles).toContain('src/index.js');
        expect(processedFiles).toContain('src/valid.js');
        
        // Check excluded files
        expect(processedFiles).not.toContain('src/test.test.js');
        expect(processedFiles).not.toContain('src/ignored/file.js');
        expect(processedFiles).not.toContain('src/temp.js');
        
        // Verify exact file count
        expect(processedFiles.length).toBe(2);
    });

    test('should output JSON when specified', async () => {
        await createTestFiles(TEST_DIR, {
            'test.txt': 'test content'
        });

        const chunks: string[] = [];
        const originalWrite = process.stdout.write;
        process.stdout.write = (chunk) => {
            chunks.push(chunk.toString());
            return true;
        };

        try {
            await PkgCommand.parseAsync(['node', 'pkg',
                '--source', TEST_DIR,
                '--dest', OUTPUT_FILE,
                '--output', 'json'
            ]);

            const output = chunks.join('');
            const result = JSON.parse(output);
            
            expect(result).toHaveProperty('totalFiles');
            expect(result).toHaveProperty('successful');
            expect(result).toHaveProperty('staticFiles');
        } finally {
            process.stdout.write = originalWrite;
        }
    });
}); 