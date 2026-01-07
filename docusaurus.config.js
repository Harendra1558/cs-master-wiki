// docusaurus.config.js
module.exports = {
  title: "CS Fundamentals Wiki",
  tagline: "From JVM to Distributed Systems",
  url: "https://your-url.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",

  // Enable Mermaid for diagrams
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          routeBasePath: "/", // Serve docs at the root URL (no /docs/ prefix)
        },
        blog: false, // Disable blog if not needed
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
