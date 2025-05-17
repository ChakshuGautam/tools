import fs from "fs";
import path from "path";

interface WikiPage {
  title: string;
  content: string;
  sourceFiles?: string[];
}

function parseRSCContent(rscContent: string): WikiPage | null {
  try {
    // First, find the title by looking for a Markdown header
    let title = "";
    const titleMatch = rscContent.match(/# ([^\n]+)/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    // Find where actual content starts - after T5cfc marker
    let contentStartIndex = rscContent.indexOf("T5cfc,");
    if (contentStartIndex === -1) {
      // If T5cfc marker is not found, look for a regular markdown header
      contentStartIndex = rscContent.indexOf("# ");
      if (contentStartIndex === -1) {
        // Still not found, we'll just use the whole content
        contentStartIndex = 0;
      }
    } else {
      // Skip past the T5cfc, marker
      contentStartIndex += 6;
    }

    // Find where content ends - at the 16:["$" marker
    let contentEndIndex = rscContent.indexOf('16:["$"');
    if (contentEndIndex === -1) {
      // If not found, try alternative end markers
      contentEndIndex = rscContent.indexOf(':"$"');
    }

    if (contentEndIndex === -1) {
      // If still not found, use the whole content
      contentEndIndex = rscContent.length;
    }

    // Extract the content between start and end
    let content = rscContent.substring(contentStartIndex, contentEndIndex);

    // Extract source files from details section
    const sourceFiles: string[] = [];
    const detailsMatch = content.match(/<details>[\s\S]*?<\/details>/);
    if (detailsMatch && detailsMatch[0]) {
      const detailsContent = detailsMatch[0];
      const fileMatches = detailsContent.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of fileMatches) {
        if (
          match[2] &&
          (match[2].includes(".ts") || match[2].includes(".js"))
        ) {
          sourceFiles.push(match[2]);
        }
      }
    }

    return {
      title,
      content,
      sourceFiles: sourceFiles.length > 0 ? sourceFiles : undefined,
    };
  } catch (error) {
    console.error(`Error parsing RSC content: ${error}`);
    return null;
  }
}

async function saveWikiPage(
  page: WikiPage,
  basePath: string,
  filename: string
): Promise<void> {
  try {
    const filePath = path.join(basePath, filename);

    let content = `# ${page.title}\n\n`;

    if (page.sourceFiles && page.sourceFiles.length > 0) {
      content += "## Relevant Source Files\n\n";
      page.sourceFiles.forEach((file) => {
        content += `* \`${file}\`\n`;
      });
      content += "\n";
    }

    content += page.content;

    await fs.promises.writeFile(filePath, content, "utf8");
    console.log(`Saved: ${filePath}`);
  } catch (error) {
    console.error(`Error saving wiki page: ${error}`);
    throw error;
  }
}

// Example usage:
async function processRSCContent(
  rscContent: string,
  basePath: string
): Promise<void> {
  const page = parseRSCContent(rscContent);
  if (!page) {
    console.error("Failed to parse RSC content");
    return;
  }

  try {
    await saveWikiPage(
      page,
      basePath,
      page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md"
    );
    console.log(`Successfully saved wiki page: ${page.title}`);
  } catch (error) {
    console.error("Error saving wiki page:", error);
  }
}

export { parseRSCContent, saveWikiPage, processRSCContent, WikiPage };
