import fs from "fs";
import path from "path";

export interface WikiPage {
  title: string;
  content: string;
}

export interface PageIndex {
  id: string;
  title: string;
}

export interface WikiStructure {
  metadata: any;
  pages: PageIndex[];
}

export function parseWikiStructure(htmlContent: string): WikiStructure | null {
  try {
    const regex = /self\.__next_f\.push\(\[1,"5:((?:.|\n)*?)"\]\)/;
    const match = htmlContent.match(regex);

    if (!match || !match[1]) {
      // This is not an error, it might just not be present on all pages
      return null;
    }

    const jsonString = JSON.parse(`"${match[1]}"`);
    const data = JSON.parse(jsonString);

    const wikiData = data?.[3]?.children?.[3]?.wiki;

    if (wikiData && wikiData.metadata && wikiData.pages) {
      const structure: WikiStructure = {
        metadata: wikiData.metadata,
        pages: wikiData.pages.map((p: any) => ({
          id: p.page_plan.id,
          title: p.page_plan.title,
        })),
      };
      return structure;
    }

    return null;
  } catch (error) {
    console.error(`Error parsing wiki structure from HTML: ${error}`);
    return null;
  }
}

export function parseWikiPagesFromHtml(htmlContent: string): WikiPage[] {
  const pages: WikiPage[] = [];
  try {
    const regex = /self\.__next_f\.push\(\[1,"#((?:.|\n)*?)"\]\)/g;
    const matches = htmlContent.matchAll(regex);

    for (const match of matches) {
      if (match && match[1]) {
        // Re-add the hash for parsing and title extraction
        const rawContent = "#" + match[1];
        const markdownContent = JSON.parse(`"${rawContent}"`);

        let title = "Untitled";
        const titleMatch = markdownContent.match(/^# (.*)/m);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim().replace(/\/$/, "");
        }

        pages.push({
          title,
          content: markdownContent,
        });
      }
    }
  } catch (error) {
    console.error(`Error parsing wiki pages from HTML: ${error}`);
  }
  return pages;
}

export async function saveWikiPage(
  page: WikiPage,
  basePath: string,
  filename: string
): Promise<void> {
  try {
    const filePath = path.join(basePath, filename);
    await fs.promises.writeFile(filePath, page.content, "utf8");
    console.log(`Saved: ${filePath}`);
  } catch (error) {
    console.error(`Error saving wiki page: ${error}`);
    throw error;
  }
}
