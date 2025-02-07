import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { glob } from 'glob';
import { join, dirname } from 'node:path';
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

const getIgnorePatterns = async (sourcePath: string): Promise<string[]> => {
    try {
        const notebookIgnore = await readFile(join(sourcePath, '.notebooklmignore'), 'utf-8');
        return notebookIgnore.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    } catch {
        try {
            const gitIgnore = await readFile(join(sourcePath, '.gitignore'), 'utf-8');
            return gitIgnore.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        } catch {
            return [];
        }
    }
};

const isStaticFile = (filepath: string): boolean => {
    const ext = filepath.substring(filepath.lastIndexOf('.')).toLowerCase();
    return STATIC_FILE_TYPES.includes(ext as typeof STATIC_FILE_TYPES[number]);
};

const createStaticFilename = (filepath: string): string => {
    return filepath.replace(/[\/\\]/g, '_').replace(/^_+|_+$/g, '');
};

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

    const ignorePatterns = await getIgnorePatterns(sourcePath);
    const defaultIgnores = [
        'node_modules/**',
        '.git/**',
        destPath,
        '*.log',
        '*.lock',
        'dist/**',
        'build/**',
        ...BLACKLIST
    ];

    const allIgnores = [...defaultIgnores, ...ignorePatterns];
    const files = await glob('**/*.*', {
        ignore: allIgnores,
        nodir: true,
        cwd: sourcePath,
        absolute: true
    });

    result.totalFiles = files.length;
    let concatenatedContent = '';

    const staticDir = join(dirname(destPath), 'static');
    await mkdir(staticDir, { recursive: true });

    for (const file of files) {
        try {
            const relativePath = file.replace(sourcePath, '').replace(/^\//, '');

            if (isStaticFile(file)) {
                const staticFileName = createStaticFilename(relativePath);
                const staticFilePath = join(staticDir, staticFileName);
                await copyFile(file, staticFilePath);
                result.staticFiles.push({
                    original: relativePath,
                    copied: `static/${staticFileName}`
                });
                concatenatedContent += `\n// Static File: ${relativePath}\n// Copied to: static/${staticFileName}\n\n`;
            } else {
                const content = await readFile(file, 'utf-8');
                concatenatedContent += `\n// File: ${relativePath}\n${content}\n`;
            }

            result.successful.push(relativePath);

            if (verbose) {
                console.log(`Processed: ${relativePath}`);
            }
        } catch (error) {
            result.failed.push({
                file,
                error: error instanceof Error ? error.message : String(error)
            });
            if (verbose) {
                console.warn(`Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    await writeFile(destPath, concatenatedContent);
    return result;
}

async function copyFile(source: string, dest: string): Promise<void> {
    const content = await readFile(source);
    await writeFile(dest, content);
} 