// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Harendra's Portfolio",
  tagline: "Software Engineer | Backend Specialist | System Design Enthusiast",
  url: "https://harendra-dev.vercel.app",
  baseUrl: "/",
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/logo.svg",

  // GitHub pages deployment config
  organizationName: "Harendra1558",
  projectName: "cs-master-wiki",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  // Internationalization
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Enable Mermaid for diagrams
  markdown: {
    mermaid: true,
  },
  themes: [
    "@docusaurus/theme-mermaid",
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      }),
    ],
  ],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          routeBasePath: "docs",
          editUrl: "https://github.com/Harendra1558/cs-master-wiki/tree/main/",
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          blogTitle: "Tech Blog",
          blogDescription: "Insights on System Design, Java, and Software Engineering",
          postsPerPage: 6,
          blogSidebarTitle: "Recent Posts",
          blogSidebarCount: 10,
          feedOptions: {
            type: "all",
            copyright: `Copyright © ${new Date().getFullYear()} Harendra's Portfolio`,
            createFeedItems: async (params) => {
              const { blogPosts, defaultCreateFeedItems, ...rest } = params;
              return defaultCreateFeedItems({
                blogPosts: blogPosts.filter((item, index) => index < 10),
                ...rest,
              });
            },
          },
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
        // gtag removed to prevent errors
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // SEO
      metadata: [
        {
          name: "keywords",
          content: "harendra, software engineer, backend developer, java, spring boot, microservices, portfolio, tech blog",
        },
        {
          name: "description",
          content: "Portfolio of Harendra, a Software Engineer specializing in Java, Spring Boot, and distributed systems. 2+ years of experience building scalable fintech applications.",
        },
        { name: "author", content: "Harendra" },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "en_US" },
        { name: "twitter:card", content: "summary_large_image" },
      ],

      // Color mode
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      // Navbar
      navbar: {
        title: "Harendra",
        logo: {
          alt: "Logo",
          src: "img/logo.svg",
        },
        items: [
          { to: "/", label: "Home", position: "left" },
          { to: "/blog", label: "Blog", position: "left" },
          {
            type: "doc",
            docId: "intro",
            position: "left",
            label: "CS Fundamentals",
          },
          {
            href: "https://github.com/Harendra1558",
            label: "GitHub",
            position: "right",
          },
          {
            href: "https://www.linkedin.com/in/harendra1558/",
            label: "LinkedIn",
            position: "right",
          },
        ],
      },

      // Footer
      footer: {
        style: "dark",
        links: [
          {
            title: "Navigation",
            items: [
              { label: "Home", to: "/" },
              { label: "Blog", to: "/blog" },
              { label: "CS Fundamentals", to: "/docs" },
            ],
          },
          {
            title: "Connect",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/Harendra1558",
              },
              {
                label: "LinkedIn",
                href: "https://www.linkedin.com/in/harendra1558/",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/yourhandle",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Resume",
                href: "#",
              },
              {
                label: "Contact",
                to: "/#contact",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Harendra's Portfolio. Built with Docusaurus.`,
      },

      // Prism theme for code blocks
      prism: {
        theme: require("prism-react-renderer").themes.github,
        darkTheme: require("prism-react-renderer").themes.dracula,
        additionalLanguages: ["java", "bash", "sql", "json"],
      },

      // Algolia search (optional - configure later)
      // algolia: {
      //   appId: 'YOUR_APP_ID',
      //   apiKey: 'YOUR_SEARCH_API_KEY',
      //   indexName: 'YOUR_INDEX_NAME',
      // },
    }),
};

module.exports = config;
