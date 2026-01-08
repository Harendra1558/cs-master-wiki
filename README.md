# 🚀 Personal Portfolio & CS Fundamentals Wiki

A modern, SEO-optimized portfolio website featuring a comprehensive Computer Science fundamentals wiki and technical blog. Built with Docusaurus 3.9.2.

## ✨ Features

- 🎨 **Stunning Portfolio Landing Page** - Modern design with gradient backgrounds and smooth animations
- 📚 **CS Fundamentals Wiki** - 17 topics covering JVM, DBMS, distributed systems, and more
- ✍️ **Technical Blog** - SEO-optimized blog with RSS feed and social sharing
- 🌙 **Dark Mode** - Beautiful dark/light theme support
- 📱 **Fully Responsive** - Mobile-first design
- 🔍 **SEO Optimized** - Meta tags, Open Graph, sitemap, robots.txt
- ⚡ **Fast Performance** - Static site generation with excellent Core Web Vitals

## 🏗️ Structure

```
├── src/
│   ├── pages/
│   │   └── index.js          # Portfolio landing page
│   ├── css/
│   │   └── custom.css        # Global styles
│   └── components/           # Reusable components
├── docs/                     # CS Fundamentals Wiki (Markdown)
├── blog/                     # Technical blog posts
├── static/                   # Static assets (images, robots.txt)
└── docusaurus.config.js      # Site configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js v20.0 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build
npm run serve
```

## 📝 Customization Guide

### 1. Update Personal Information

Edit `docusaurus.config.js`:

```javascript
{
  title: "Your Name's Portfolio",
  tagline: "Your tagline here",
  url: "https://yourusername.github.io",
  baseUrl: "/your-repo-name/",
  organizationName: "yourusername",
  projectName: "your-repo-name",
}
```

### 2. Update Landing Page Content

Edit `src/pages/index.js`:

- **Hero Section**: Update name, title, description
- **About Section**: Add your bio and stats
- **Skills**: Add your technologies
- **Projects**: Showcase your work
- **Contact**: Update email and social links

### 3. Update Blog Author

Edit `blog/authors.yml`:

```yaml
yourname:
  name: Your Name
  title: Your Title
  url: https://github.com/yourusername
  image_url: https://github.com/yourusername.png
  socials:
    github: yourusername
    linkedin: yourprofile
```

### 4. Update Navigation & Footer

Edit navbar and footer in `docusaurus.config.js`:

```javascript
navbar: {
  items: [
    { to: '/', label: 'Home', position: 'left' },
    { to: '/blog', label: 'Blog', position: 'left' },
    // Add more...
  ]
}
```

### 5. Update SEO Metadata

- Edit meta tags in `docusaurus.config.js`
- Update descriptions in frontmatter of blog posts and docs
- Replace Google Analytics ID: `gtag: { trackingID: 'G-XXXXXXXXXX' }`

### 6. Add Custom Images

Replace placeholder images in:
- `static/img/` - Favicon, logo, social card
- Blog post images - Reference in frontmatter

## ✍️ Writing Blog Posts

Create a new file in `blog/` folder:

```markdown
---
slug: your-post-slug
title: Your Post Title
authors: [yourname]
tags: [tag1, tag2]
image: /img/blog/your-image.jpg
description: SEO description for this post
keywords: [keyword1, keyword2]
---

# Your Post Title

Introduction paragraph...

<!--truncate-->

Rest of your content...
```

## 📚 Adding Documentation

Create markdown files in `docs/` folders:

```markdown
---
id: unique-id
title: Page Title
sidebar_position: 1
description: Page description for SEO
keywords: [keyword1, keyword2]
---

# Page Title

Your content with code examples, diagrams, etc.
```

## 🎨 Customizing Styles

Edit `src/css/custom.css`:

```css
:root {
  --ifm-color-primary: #667eea;  /* Your brand color */
  --ifm-font-family-base: 'Inter', sans-serif;
}
```

For landing page styles, edit `src/pages/index.module.css`.

## 🚢 Deployment

### GitHub Pages

1. Update `docusaurus.config.js` with your GitHub details
2. Run:

```bash
GIT_USER=yourusername npm run deploy
```

### Other Platforms

- **Vercel**: Import repo and deploy
- **Netlify**: Connect repo and set build command to `npm run build`
- **Cloudflare Pages**: Build command `npm run build`, output directory `build`

## 📊 SEO Checklist

- [x] Sitemap auto-generated
- [x] Robots.txt configured
- [x] Meta descriptions on all pages
- [x] Open Graph tags
- [x] Twitter Card tags
- [x] Structured data (JSON-LD)
- [x] Fast page load times
- [x] Mobile responsive
- [ ] Add Google Analytics ID
- [ ] Submit sitemap to Google Search Console
- [ ] Add custom domain (optional)

## 🛠️ Technologies Used

- **Docusaurus 3.9.2** - Static site generator
- **React 19** - UI framework
- **Mermaid** - Diagram generation
- **Prism** - Syntax highlighting
- **Inter Font** - Typography

## 📖 Documentation

- [Docusaurus Docs](https://docusaurus.io/)
- [Markdown Features](https://docusaurus.io/docs/markdown-features)
- [Blog Features](https://docusaurus.io/docs/blog)

## 📝 License

MIT License - feel free to use this template for your own portfolio!

## 🤝 Contributing

Issues and pull requests are welcome! Please feel free to contribute.

---

**Built with ❤️ using Docusaurus**

