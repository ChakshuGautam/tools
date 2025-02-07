import { mkdir, writeFile, readdir as fsReaddir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export interface TestFile {
    path: string;
    content: string | Buffer;
}

export async function createTestFiles(baseDir: string, files: Record<string, string | Buffer>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
        const fullPath = join(baseDir, path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content);
    }
}

export async function readdir(path: string): Promise<string[]> {
    return fsReaddir(path);
}

export const TEST_FILES = {
    TEXT: [
        {
            path: 'src/index.js',
            content: 'console.log("Hello World");'
        },
        {
            path: 'src/utils/helper.js',
            content: 'export const add = (a, b) => a + b;'
        },
        {
            path: 'package.json',
            content: '{"name": "test-repo"}'
        }
    ],
    STATIC: [
        {
            path: 'assets/image.png',
            content: Buffer.from([0x89, 0x50, 0x4E, 0x47])
        },
        {
            path: 'docs/document.pdf',
            content: Buffer.from([0x25, 0x50, 0x44, 0x46])
        }
    ],
    IGNORED: [
        {
            path: 'src/ignored/ignored-file.js',
            content: 'console.log("Should not be included");'
        },
        {
            path: 'src/component.test.js',
            content: 'test("should work", () => {});'
        }
    ]
}; 