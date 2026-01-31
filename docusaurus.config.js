// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Harendra's Portfolio",
  tagline: "Software Engineer | Backend Specialist | System Design Enthusiast",
  url: "https://harendra-dev.vercel.app",
  baseUrl: "/",
  onBrokenLinks: "throw",
  // onBrokenMarkdownLinks: "warn", // Deprecated, using default behavior
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

  // Plugins for redirects and additional functionality
  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          // Redirects temporarily disabled to fix build
          // {
          //   from: "/docs/java-jvm-internals",
          //   to: "/docs/category/1-java--jvm-internals",
          // },
          // {
          //   from: "/docs/dbms-data-persistence",
          //   to: "/docs/category/2-dbms--data-persistence",
          // },
          // {
          //   from: "/docs/spring-boot-internals",
          //   to: "/docs/category/3-spring-boot-internals",
          // },
        ],
      },
    ],
    // PWA Plugin for offline support and app installability
    [
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'queryString',
        ],
        pwaHead: [
          {
            tagName: 'link',
            attributes: {
              rel: 'icon',
              href: '/img/logo.svg',
            },
          },
          {
            tagName: 'link',
            attributes: {
              rel: 'manifest',
              href: '/manifest.json',
            },
          },
          {
            tagName: 'meta',
            attributes: {
              name: 'theme-color',
              content: '#6366f1',
            },
          },
          {
            tagName: 'meta',
            attributes: {
              name: 'apple-mobile-web-app-capable',
              content: 'yes',
            },
          },
          {
            tagName: 'meta',
            attributes: {
              name: 'apple-mobile-web-app-status-bar-style',
              content: 'black-translucent',
            },
          },
          {
            tagName: 'link',
            attributes: {
              rel: 'apple-touch-icon',
              href: '/img/logo.svg',
            },
          },
        ],
      },
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
        gtag: {
          trackingID: "G-L37WFPV80X",
          anonymizeIP: true, // Privacy-friendly: anonymizes visitor IP
        },
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
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Resume",
                href: "https://drive.google.com/file/d/1aFKAM-ZU8xbPwqrADwt0FwaFVfOf_zXq/view?usp=drive_link",
              },
              {
                label: "Contact",
                href: "/#contact",
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Harendra. All rights reserved.`,
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
