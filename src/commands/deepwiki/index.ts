import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { Command } from "commander";
import { parseRSCContent, saveWikiPage } from "./rscParser";

interface WikiLink {
  title: string;
  link: string;
  level: number;
  children?: WikiLink[];
}

function parseWikiLinks(html: string): WikiLink[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Find the sidebar unordered list element
  const sidebarUl = doc.querySelector("ul.flex-1.flex-shrink-0.space-y-1");
  if (!sidebarUl) return [];

  const links: WikiLink[] = [];
  const listItems = sidebarUl.querySelectorAll("li");

  listItems.forEach((li) => {
    const anchor = li.querySelector("a");
    if (!anchor) return;

    const paddingStyle = li.getAttribute("style") || "";
    const paddingMatch = paddingStyle.match(/padding-left:\s*(\d+)px/);
    const paddingLeft = paddingMatch ? paddingMatch[1] : "0";

    // Determine level based on padding
    const level = paddingLeft === "12" ? 1 : paddingLeft === "0" ? 0 : -1;
    if (level === -1) return;

    const link: WikiLink = {
      title: anchor.textContent?.trim() || "",
      link: anchor.getAttribute("href") || "",
      level,
      children: [],
    };

    // Add to hierarchy
    if (level === 0 || links.length === 0) {
      links.push(link);
    } else {
      // Find the last parent
      let parent = links[links.length - 1];
      while (
        parent.children &&
        parent.children.length > 0 &&
        parent.level < level - 1
      ) {
        parent = parent.children[parent.children.length - 1];
      }

      if (parent.children) {
        parent.children.push(link);
      }
    }
  });

  return links;
}

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

async function fetchRSCContent(rscLink: string): Promise<string> {
  try {
    // Format the URL correctly - we need the deepwiki URL pattern
    // The link might be a full URL or a relative path
    const url = rscLink.startsWith("http")
      ? rscLink
      : `https://deepwiki.com${rscLink}`;

    const response = await fetch(url, {
      headers: {
        rsc: "1", // This header is required to get RSC content
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching RSC content: ${error}`);
    throw error;
  }
}

function generateFilename(title: string, index: number): string {
  // Replace invalid characters and make a slug
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  return `${index}-${slug}.md`;
}

async function processLinks(
  links: WikiLink[],
  outputPath: string,
  prefix = "",
  githubSlug: string
) {
  let index = 1;

  for (const link of links) {
    const fileIndex = `${prefix}${index}`;

    // Process any link that seems to point to a wiki page
    if (link.link && link.link.length > 0) {
      try {
        console.log(`Processing ${link.title} (${link.link})`);

        // The link might be a full URL or a relative path
        const rscLink = link.link.startsWith("http")
          ? link.link
          : `/${githubSlug}${link.link}`;

        const rscContent = await fetchRSCContent(rscLink);
        const wikiPage = parseRSCContent(rscContent);

        if (wikiPage) {
          wikiPage.title = link.title;
          const filename = `${fileIndex}-${generateFilename(
            link.title,
            index
          )}`;
          await saveWikiPage(wikiPage, outputPath, filename);
        }
      } catch (error) {
        console.error(`Error processing link ${link.title}: ${error}`);
      }
    }

    if (link.children && link.children.length > 0) {
      await processLinks(
        link.children,
        outputPath,
        `${fileIndex}.`,
        githubSlug
      );
    }

    index++;
  }
}

async function executeDeepWiki(githubSlug: string, outputPath: string) {
  try {
    console.log(`Fetching DeepWiki for ${githubSlug}...`);

    // Create output directory if it doesn't exist
    const repoName = githubSlug.split("/").pop() || githubSlug;
    const repoPath = path.join(outputPath, repoName);

    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }

    // Fetch and parse home page
    const homeHtml = await fetchWikiHome(githubSlug);
    const links = parseWikiLinks(homeHtml);

    // Process all links
    await processLinks(links, repoPath, "", githubSlug);

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
export {
  parseWikiLinks,
  fetchWikiHome,
  fetchRSCContent,
  executeDeepWiki,
  WikiLink,
};
