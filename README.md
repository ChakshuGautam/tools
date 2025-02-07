# tools

A collection of command-line tools for local development workflow.

## Installation

```bash
# Install dependencies
bun install

# Link the package globally
bun link
```

## Available Commands

### pkg - File Concatenation Tool

Concatenates text files and manages static files (images, PDFs, etc.) while respecting ignore patterns.

```bash
# Basic usage
tools pkg --dest output.txt

# Specify source directory
tools pkg --source /path/to/source --dest output.txt

# Verbose output
tools pkg --source ./src --dest output.txt --verbose

# JSON output (for piping)
tools pkg --source ./src --dest output.txt --output json | some-other-tool
```

#### Features:

- Concatenates text files into a single output file
- Automatically handles static files:
  - Creates a `static/` directory alongside the output file
  - Copies static files (images, PDFs, etc.) to the static directory
  - Renames files based on their path to avoid conflicts
  - Adds references to static files in the output file
- Respects .notebooklmignore or .gitignore patterns
- Provides verbose output option for detailed processing information

#### Options:

- `-d, --dest <path>`: Destination path for output (default: "notebooklm")
- `-s, --source <path>`: Source directory to process (default: current directory)
- `-v, --verbose`: Show detailed execution information
- `-o, --output <type>`: Output format (text/json) (default: "text")

## Design Principles

1. Each command follows the Unix philosophy:
   - Do one thing and do it well
   - Support piping and composition
   - Handle text streams as input/output

2. All commands support:
   - Verbose output (-v, --verbose)
   - JSON output for piping
   - Clear error messages
   - Help documentation

3. Command output is always structured to enable:
   - Human-readable output by default
   - Machine-readable output when needed
   - Piping between commands

## Adding New Commands

1. Create a new directory under `src/commands/` with your command name
2. Create an `index.js` file that exports:
   - `command`: Command name
   - `description`: Command description
   - `setup(program)`: Function to setup command options

Example:
```javascript
// src/commands/newcommd/index.js
export const command = 'newcommd';
export const description = 'New command description';

export function setup(program) {
    program
        .command(command)
        .description(description)
        .option('-v, --verbose', 'show detailed execution information')
        .action(async (options) => {
            // Command implementation
        });
}
```

## Help

To see help for any command:
```bash
tools --help           # General help
tools pkg --help       # Help for pkg command
```

This project was created using `bun init` in bun v1.0.25. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
