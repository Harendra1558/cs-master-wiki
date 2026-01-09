import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// Hero Section
function Hero() {
    return (
        <header className={styles.hero}>
            <div className={styles.heroContainer}>
                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <span className={styles.greeting}>👋 Hi, I'm</span>
                        <h1 className={styles.heroTitle}>
                            <span className={styles.gradientText}>Harendra</span>
                        </h1>
                        <h2 className={styles.heroSubtitle}>
                            Software Engineer
                        </h2>
                        <p className={styles.heroDescription}>
                            Specializing in building scalable backend systems with <strong>Java</strong>, <strong>Spring Boot</strong>, and <strong>Microservices</strong>.
                            Experienced in fintech applications, secure API design, and cloud deployments on AWS.
                        </p>
                        <div className={styles.heroButtons}>
                            <Link
                                className={clsx('button button--primary button--lg', styles.heroButton)}
                                to="/docs">
                                📚 Explore CS Fundamentals
                            </Link>
                            <Link
                                className={clsx('button button--secondary button--lg', styles.heroButton)}
                                to="/blog">
                                ✍️ Read My Blog
                            </Link>
                        </div>
                        <div className={styles.socialLinks}>
                            <a href="https://github.com/Harendra1558" target="_blank" rel="noopener noreferrer">
                                <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" />
                            </a>
                            <a href="https://www.linkedin.com/in/harendra1558/" target="_blank" rel="noopener noreferrer">
                                <img src="https://cdn.simpleicons.org/linkedin/white" alt="LinkedIn" />
                            </a>
                            <a href="mailto:harendrakumar1558@gmail.com">
                                <img src="https://cdn.simpleicons.org/gmail/white" alt="Email" />
                            </a>
                        </div>
                    </div>
                    <div className={styles.heroImage}>
                        <div className={styles.avatarContainer}>
                            <div className={styles.avatar}>
                                <span className={styles.avatarText}>H</span>
                            </div>
                            <div className={styles.floatingIcon} style={{ top: '10%', left: '0%' }}>☕</div>
                            <div className={styles.floatingIcon} style={{ top: '20%', right: '5%' }}>🚀</div>
                            <div className={styles.floatingIcon} style={{ bottom: '15%', left: '5%' }}>💻</div>
                            <div className={styles.floatingIcon} style={{ bottom: '10%', right: '0%' }}>☁️</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

// About Section
function About() {
    return (
        <section className={styles.section} id="about">
            <div className="container">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.gradientText}>Professional Summary</span>
                </h2>
                <div className={styles.aboutContent}>
                    <div className={styles.aboutText}>
                        <p>
                            I am a Software Engineer with 2 years of experience in full-stack development, specializing in backend systems using <strong>Java, Spring Boot, and microservices architecture</strong>.
                        </p>
                        <p>
                            Currently, I work on building scalable fintech applications, optimizing system performance, and integrating secure third-party services.
                            I have a proven ability to collaborate across cross-functional teams to deliver secure, compliant, and high-quality solutions.
                        </p>
                        <p>
                            My passion lies in backend architecture, innovative product development, and solving complex algorithmic challenges.
                        </p>
                    </div>
                    <div className={styles.stats}>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>2+</div>
                            <div className={styles.statLabel}>Years Experience</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>400+</div>
                            <div className={styles.statLabel}>DSA Problems Solved</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber}>1612</div>
                            <div className={styles.statLabel}>LeetCode Rating</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Experience Section
function Experience() {
    return (
        <section className={clsx(styles.section, styles.experienceSection)}>
            <div className="container">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.gradientText}>Experience</span>
                </h2>
                <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                        <div className={styles.timelineMarker}></div>
                        <div className={styles.timelineContent}>
                            <div className={styles.timelineHeader}>
                                <h3>Software Engineer</h3>
                                <span className={styles.company}>UGRO Capital</span>
                                <span className={styles.duration}>Feb 2023 – Present</span>
                            </div>
                            <ul className={styles.timelineList}>
                                <li>Developed and managed the <strong>Loan Origination System (LOS)</strong> and <strong>Loan Management System (LMS)</strong>.</li>
                                <li>Led integration of third-party APIs (GST, CIBIL, TransUnion, Perfios) using <strong>Reactive Java</strong>.</li>
                                <li>Improved API performance by reducing latency by <strong>50%</strong> through multithreading and optimization.</li>
                                <li>Implemented <strong>RSA/AES hybrid encryption</strong> for secure communication.</li>
                                <li>Collaborated with security teams to ensure compliance with <strong>RBI standards</strong>.</li>
                                <li>Designed <strong>CI/CD pipelines</strong> using Docker, Jenkins, and AWS ECS.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Skills Section
function Skills() {
    const skillCategories = [
        {
            title: '💻 Languages',
            skills: ['Java', 'JavaScript', 'SQL (MySQL)'],
        },
        {
            title: '🔧 Frameworks',
            skills: ['Spring Boot', 'React', 'Angular', 'Hibernate'],
        },
        {
            title: '☁️ DevOps & Cloud',
            skills: ['AWS (ECS, S3)', 'Docker', 'Jenkins', 'CloudWatch'],
        },
        {
            title: '🛠️ Tools',
            skills: ['Git & GitHub', 'Jira', 'Postman', 'IntelliJ IDEA'],
        },
        {
            title: '🧠 Concepts',
            skills: ['DSA', 'OOP', 'DBMS', 'System Design', 'Networking'],
        },
        {
            title: '🎨 UI/UX',
            skills: ['HTML/CSS', 'Bootstrap', 'Material-UI'],
        },
    ];

    return (
        <section className={styles.section}>
            <div className="container">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.gradientText}>Technical Skills</span>
                </h2>
                <div className={styles.skillsGrid}>
                    {skillCategories.map((category, idx) => (
                        <div key={idx} className={styles.skillCategory}>
                            <h3>{category.title}</h3>
                            <div className={styles.skillTags}>
                                {category.skills.map((skill, skillIdx) => (
                                    <span key={skillIdx} className={styles.skillTag}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Projects Section
function Projects() {
    const projects = [
        {
            title: '🔗 URL Shortener with QR Code',
            description: 'A robust URL shortening service with custom aliases, expiration dates, and customizable QR code generation. Features analytics tracking for user engagement.',
            tech: ['Java', 'Spring Boot', 'MySQL', 'React'],
            link: '#',
            github: 'https://github.com/Harendra1558', // Placeholder if specific repo link isn't provided
        },
        {
            title: '📚 CS Fundamentals Wiki',
            description: 'Comprehensive documentation covering JVM internals, DBMS optimization, Spring Boot, distributed systems, and more.',
            tech: ['Docusaurus', 'React', 'Mermaid', 'Markdown'],
            link: '/docs',
            github: 'https://github.com/Harendra1558/cs-master-wiki',
        },
    ];

    return (
        <section className={styles.section} id="projects">
            <div className="container">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.gradientText}>Personal Projects</span>
                </h2>
                <div className={styles.projectsGrid}>
                    {projects.map((project, idx) => (
                        <div key={idx} className={styles.projectCard}>
                            <div className={styles.projectHeader}>
                                <h3>{project.title}</h3>
                            </div>
                            <p className={styles.projectDescription}>{project.description}</p>
                            <div className={styles.projectTech}>
                                {project.tech.map((tech, techIdx) => (
                                    <span key={techIdx} className={styles.techBadge}>
                                        {tech}
                                    </span>
                                ))}
                            </div>
                            <div className={styles.projectLinks}>
                                {project.link !== '#' && (
                                    <Link to={project.link} className={styles.projectLink}>
                                        View Project →
                                    </Link>
                                )}
                                <a href={project.github} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
                                    GitHub
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Contact Section
function Contact() {
    return (
        <section className={clsx(styles.section, styles.contactSection)} id="contact">
            <div className="container">
                <h2 className={styles.sectionTitle}>
                    <span className={styles.gradientText}>Let's Connect</span>
                </h2>
                <div className={styles.contactContent}>
                    <p className={styles.contactText}>
                        Open to discussing scalable backend architectures, fintech solutions, or new opportunities.
                    </p>
                    <div className={styles.contactMethods}>
                        <a href="mailto:harendrakumar1558@gmail.com" className={styles.contactCard}>
                            <span className={styles.contactIcon}>📧</span>
                            <span className={styles.contactLabel}>Email Me</span>
                            <span className={styles.contactValue}>harendrakumar1558@gmail.com</span>
                        </a>
                        <a href="https://www.linkedin.com/in/harendra1558/" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                            <span className={styles.contactIcon}>💼</span>
                            <span className={styles.contactLabel}>LinkedIn</span>
                            <span className={styles.contactValue}>View Profile</span>
                        </a>
                        <a href="https://github.com/Harendra1558" target="_blank" rel="noopener noreferrer" className={styles.contactCard}>
                            <span className={styles.contactIcon}>💻</span>
                            <span className={styles.contactLabel}>GitHub</span>
                            <span className={styles.contactValue}>Harendra1558</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Main Component
export default function Home() {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title="Harendra - Software Engineer"
            description="Portfolio of Harendra, a Software Engineer specializing in Java, Spring Boot, and Microservices.">
            <Hero />
            <About />
            <Experience />
            <Skills />
            <Projects />
            <Contact />
        </Layout>
    );
}
