import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const siteDataPath = join(__dirname, "../../src/_data/site.json");
const siteData = JSON.parse(readFileSync(siteDataPath, "utf-8"));

describe("site data", () => {
  describe("navigation", () => {
    it("has 5 navigation items", () => {
      expect(siteData.nav).toHaveLength(5);
    });

    it("includes Blog as the last item", () => {
      const lastItem = siteData.nav[siteData.nav.length - 1];
      expect(lastItem.label).toBe("Blog");
      expect(lastItem.href).toBe("https://blog.brazildecoded.com.br");
      expect(lastItem.key).toBe("blog");
    });

    it("has correct navigation structure", () => {
      siteData.nav.forEach((item) => {
        expect(item).toHaveProperty("label");
        expect(item).toHaveProperty("href");
        expect(item).toHaveProperty("key");
      });
    });
  });
});