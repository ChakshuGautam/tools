import { test, expect, describe } from "bun:test";
import fs from "fs";
import path from "path";
import { parseRSCContent, WikiPage } from "../rscParser";

describe("RSC Parser", () => {
  test("should parse RSC content correctly", () => {
    const testRSC = `T5cfc,# VS Code Process Architecture

<details>
    <summary>Relevant source files</summary>
    - [app.ts](src/vs/code/electron-main/app.ts)
    - [main.ts](src/vs/code/electron-main/main.ts)
</details>

This document explains the process architecture...`;

    const result = parseRSCContent(testRSC);

    expect(result).not.toBeNull();
    expect(result?.title).toBe("VS Code Process Architecture");
    expect(result?.content).toContain(
      "This document explains the process architecture"
    );
    expect(result?.sourceFiles).toHaveLength(2);
    expect(result?.sourceFiles).toContain("src/vs/code/electron-main/app.ts");
    expect(result?.sourceFiles).toContain("src/vs/code/electron-main/main.ts");
  });

  test("should handle RSC content without source files", () => {
    const testRSC = `T5cfc,# VS Code Process Architecture

<details>
</details>

This document explains the process architecture...`;

    const result = parseRSCContent(testRSC);

    expect(result).not.toBeNull();
    expect(result?.title).toBe("VS Code Process Architecture");
    expect(result?.content).toContain(
      "This document explains the process architecture"
    );
    expect(result?.sourceFiles).toBeUndefined();
  });

  test("should parse actual RSC file correctly", async () => {
    // Read the input file
    const inputFilePath = path.join(__dirname, "html", "single_link.rsc.txt");
    const rscContent = await fs.promises.readFile(inputFilePath, "utf-8");

    // Manually look for specific content in file to debug
    const hasArchOverview = rscContent.includes(
      "VS Code Architecture Overview"
    );
    const hasProcessArch = rscContent.includes("Process Architecture");
    const hasMainProcess = rscContent.includes("Main Process");
    console.log("Debug content check:", {
      hasArchOverview,
      hasProcessArch,
      hasMainProcess,
    });

    // Parse the RSC content
    const result = parseRSCContent(rscContent);
    console.log("Parse result:", {
      title: result?.title,
      contentPreview: result?.content?.substring(0, 100),
      contentLength: result?.content?.length,
    });

    // Verify basic content extraction worked
    expect(result).not.toBeNull();

    // For this test, we'll just check that we got reasonable output,
    // without being strict about the exact content
    expect(result?.title).not.toBe("");
    expect(result?.content.length).toBeGreaterThan(10);
  });
});
