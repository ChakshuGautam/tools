import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { glob } from 'glob';
import type { ProcessResult } from '../../types.js';

const BLACKLIST = [
    'bun.toml',
    'bun.lockb',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
] as const;

const STATIC_FILE_TYPES = [
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',  // Images
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Documents
    '.mp3', '.mp4', '.wav', '.avi', '.mov', // Media
    '.zip', '.rar', '.7z', '.tar', '.gz'    // Archives
] as const;

const isStaticFile = (filepath: string): boolean => {
    const ext = filepath.substring(filepath.lastIndexOf('.')).toLowerCase();
    return STATIC_FILE_TYPES.includes(ext as typeof STATIC_FILE_TYPES[number]);
};

const createStaticFilename = (filepath: string): string => {
    return filepath.replace(/[\/\\]/g, '_').replace(/^_+|_+$/g, '');
};

async function getIgnorePatterns(sourcePath: string): Promise<string[]> {
    const defaultPatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/*.log',
        '**/*.lock',
        '**/dist/**',
        '**/build/**',
        ...BLACKLIST.map(file => `**/${file}`)
    ];

    try {
        const ignoreFile = await readFile(join(sourcePath, '.notebooklmignore'), 'utf-8')
            .catch(() => readFile(join(sourcePath, '.gitignore'), 'utf-8'));
        
        const patterns = ignoreFile
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(pattern => {
                // Always ensure pattern starts with **/ for consistent matching
                pattern = pattern.startsWith('**/') ? pattern : `**/${pattern}`;
                // Ensure directory patterns end with /**
                if (pattern.endsWith('/')) {
                    pattern = `${pattern}**`;
                }
                return pattern;
            });

        return [...defaultPatterns, ...patterns];
    } catch {
        return defaultPatterns;
    }
}

export async function concatFiles(
    destPath: string,
    sourcePath: string = process.cwd(),
    verbose: boolean = false
): Promise<ProcessResult> {
    const result: ProcessResult = {
        totalFiles: 0,
        successful: [],
        failed: [],
        staticFiles: [],
        output: destPath
    };

    try {
        const ignorePatterns = await getIgnorePatterns(sourcePath);
        // Add the output file to ignore patterns
        ignorePatterns.push(`**/${relative(sourcePath, destPath)}`);

        if (verbose) {
            console.log('Using ignore patterns:', ignorePatterns);
        }

        const files = await glob('**/*.*', {
            ignore: ignorePatterns,
            cwd: sourcePath,
            dot: false,
            nodir: true,
            absolute: false,
            matchBase: true,
            follow: false
        });

        result.totalFiles = files.length;
        let concatenatedContent = '';

        const staticDir = join(dirname(destPath), 'static');
        await mkdir(staticDir, { recursive: true });

        for (const relativePath of files) {
            try {
                const fullPath = join(sourcePath, relativePath);

                if (isStaticFile(relativePath)) {
                    const staticFileName = createStaticFilename(relativePath);
                    const staticFilePath = join(staticDir, staticFileName);
                    await copyFile(fullPath, staticFilePath);
                    result.staticFiles.push({
                        original: relativePath,
                        copied: `static/${staticFileName}`
                    });
                    concatenatedContent += `\n// Static File: ${relativePath}\n// Copied to: static/${staticFileName}\n\n`;
                } else {
                    const content = await readFile(fullPath, 'utf-8');
                    concatenatedContent += `\n// File: ${relativePath}\n${content}\n`;
                }

                result.successful.push(relativePath);
                if (verbose) {
                    console.log(`Processed: ${relativePath}`);
                }
            } catch (error) {
                result.failed.push({
                    file: relativePath,
                    error: error instanceof Error ? error.message : String(error)
                });
                if (verbose) {
                    console.warn(`Failed to process ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        await writeFile(destPath, concatenatedContent);
        return result;
    } catch (error) {
        if (verbose) {
            console.error('Error:', error);
        }
        throw error;
    }
}

async function copyFile(source: string, dest: string): Promise<void> {
    const content = await readFile(source);
    await writeFile(dest, content);
} 