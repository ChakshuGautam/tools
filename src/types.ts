export interface ProcessResult {
    totalFiles: number;
    successful: string[];
    failed: Array<{
        file: string;
        error: string;
    }>;
    staticFiles: Array<{
        original: string;
        copied: string;
    }>;
    output: string;
}

export interface CommandOptions {
    dest: string;
    source: string;
    verbose: boolean;
    output: 'text' | 'json';
} 