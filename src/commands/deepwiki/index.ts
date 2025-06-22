import fs from "fs";
import path from "path";
import { Command } from "commander";
import {
  parseWikiPagesFromHtml,
  parseWikiStructure,
  saveWikiPage,
  WikiPage,
} from "./rscParser";

async function fetchWikiHome(githubSlug: string): Promise<string> {
  try {
    const url = `https://deepwiki.com/${githubSlug}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching DeepWiki home page: ${error}`);
    throw error;
  }
}

function generateFilenameFromId(id: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const formattedId = id.replace(/\./g, "-");
  return `${formattedId}-${slug}.md`;
}

function generatePaddedFilename(
  title: string,
  index: number,
  total: number
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const padding = String(total).length;
  const paddedIndex = String(index).padStart(padding, "0");
  return `${paddedIndex}-${slug}.md`;
}

async function executeDeepWiki(githubSlug: string, outputPath: string) {
  try {
    console.log(`Fetching DeepWiki for ${githubSlug}...`);

    const repoName = githubSlug.split("/").pop() || githubSlug;
    const repoPath = path.join(outputPath, repoName);

    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }

    const homeHtml = await fetchWikiHome(githubSlug);
    const structure = parseWikiStructure(homeHtml);
    const pages = parseWikiPagesFromHtml(homeHtml);

    if (structure) {
      const indexFilePath = path.join(repoPath, "_index.json");
      await fs.promises.writeFile(
        indexFilePath,
        JSON.stringify(structure, null, 2),
        "utf8"
      );
      console.log(`Saved wiki index to ${indexFilePath}`);

      const pageContentMap = new Map(pages.map((p) => [p.title, p.content]));

      for (const pageInfo of structure.pages) {
        const content = pageContentMap.get(pageInfo.title);
        if (content) {
          const filename = generateFilenameFromId(pageInfo.id, pageInfo.title);
          const pageToSave: WikiPage = { title: pageInfo.title, content };
          await saveWikiPage(pageToSave, repoPath, filename);
        } else {
          console.warn(`Could not find content for page: ${pageInfo.title}`);
        }
      }
    } else if (pages.length > 0) {
      console.warn(
        "Could not parse wiki structure, falling back to simple page extraction."
      );
      const totalPages = pages.length;
      for (let i = 0; i < totalPages; i++) {
        const wikiPage = pages[i];
        const filename = generatePaddedFilename(
          wikiPage.title,
          i + 1,
          totalPages
        );
        await saveWikiPage(wikiPage, repoPath, filename);
      }
    } else {
      console.error("Failed to parse any wiki pages.");
    }

    console.log(`DeepWiki content saved to ${repoPath}`);
  } catch (error) {
    console.error(`Failed to execute DeepWiki command: ${error}`);
  }
}

const deepwikiCommand = new Command("deepwiki")
  .description("Download and parse DeepWiki content for a GitHub repository")
  .argument("<githubSlug>", "GitHub slug in format org/repo")
  .option("-o, --output <path>", "Output directory", "./output")
  .action((githubSlug, options) => {
    executeDeepWiki(githubSlug, options.output);
  });

export default deepwikiCommand;

// Also export other components for testing
export { fetchWikiHome, executeDeepWiki };
