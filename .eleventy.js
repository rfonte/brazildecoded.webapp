const htmlmin = require("html-minifier-terser");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/_headers");
  eleventyConfig.addPassthroughCopy("src/CNAME");

  // Add dynamic build version using git commit hash
  eleventyConfig.addGlobalData("buildVersion", () => {
    try {
      return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch (error) {
      // Fallback to timestamp if git is not available
      return Date.now().toString();
    }
  });

  eleventyConfig.addGlobalData("buildDate", () => {
    return new Date().toISOString().slice(0, 10);
  });

  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return htmlmin.minify(content, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      });
    }
    return content;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "dist",
    },
  };
};
