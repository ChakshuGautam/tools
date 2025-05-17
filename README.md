# tools

CLI utilities for common development tasks.

## Installation

```bash
# Run directly with npx
npx @tfw.in/tools <command>

# Or install globally
npm install -g @tfw.in/tools
```

## Usage

### Package Files

Concatenate files into a single output file:

```bash
tools pkg --source ./src --dest output.txt
```

Options:

- `--source`: Source directory (default: current directory)
- `--dest`: Output file path
- `--verbose`: Show detailed output
- `--output`: Output format (text/json)

### DeepWiki

Download and convert DeepWiki content from GitHub repositories to markdown files:

```bash
tools deepwiki <githubSlug> --output ./docs
```

Examples:

```bash
# Download Next.js documentation
tools deepwiki vercel/next.js --output ./next-docs

# Download VS Code documentation
tools deepwiki microsoft/vscode --output ./vscode-docs
```

Options:

- `--output`: Output directory (default: ./output)

### Ignore Patterns

Uses `.notebooklmignore` or `.gitignore` for excluding files. Default ignores:

- node_modules
- .git
- build/dist directories
- Log files
- Lock files

## License

ISC
