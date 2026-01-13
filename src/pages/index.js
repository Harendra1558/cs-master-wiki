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
                            <a
                                href="https://github.com/Harendra1558"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Visit my GitHub profile"
                                title="GitHub"
                                className={styles.socialIcon}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/harendra1558/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Connect with me on LinkedIn"
                                title="LinkedIn"
                                className={styles.socialIcon}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                </svg>
                            </a>
                            <a
                                href="mailto:harendrakumar1558@gmail.com"
                                aria-label="Send me an email"
                                title="Email"
                                className={styles.socialIcon}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                                </svg>
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
            skills: [
                { name: 'Java', icon: 'https://cdn.simpleicons.org/openjdk/ED8B00' },
                { name: 'JavaScript', icon: 'https://cdn.simpleicons.org/javascript/F7DF1E' },
                { name: 'SQL', icon: 'https://cdn.simpleicons.org/mysql/4479A1' },
            ],
        },
        {
            title: '🔧 Frameworks',
            skills: [
                { name: 'Spring Boot', icon: 'https://cdn.simpleicons.org/springboot/6DB33F' },
                { name: 'React', icon: 'https://cdn.simpleicons.org/react/61DAFB' },
                { name: 'Angular', icon: 'https://cdn.simpleicons.org/angular/DD0031' },
                { name: 'Hibernate', icon: 'https://cdn.simpleicons.org/hibernate/59666C' },
            ],
        },
        {
            title: '☁️ DevOps & Cloud',
            skills: [
                { name: 'AWS', icon: 'https://cdn.simpleicons.org/amazonaws/FF9900' },
                { name: 'Docker', icon: 'https://cdn.simpleicons.org/docker/2496ED' },
                { name: 'Jenkins', icon: 'https://cdn.simpleicons.org/jenkins/D24939' },
                { name: 'Kubernetes', icon: 'https://cdn.simpleicons.org/kubernetes/326CE5' },
            ],
        },
        {
            title: '🛠️ Tools',
            skills: [
                { name: 'Git', icon: 'https://cdn.simpleicons.org/git/F05032' },
                { name: 'GitHub', icon: 'https://cdn.simpleicons.org/github/181717' },
                { name: 'Postman', icon: 'https://cdn.simpleicons.org/postman/FF6C37' },
                { name: 'IntelliJ', icon: 'https://cdn.simpleicons.org/intellijidea/000000' },
            ],
        },
        {
            title: '🗄️ Databases',
            skills: [
                { name: 'MySQL', icon: 'https://cdn.simpleicons.org/mysql/4479A1' },
                { name: 'PostgreSQL', icon: 'https://cdn.simpleicons.org/postgresql/4169E1' },
                { name: 'Redis', icon: 'https://cdn.simpleicons.org/redis/DC382D' },
                { name: 'MongoDB', icon: 'https://cdn.simpleicons.org/mongodb/47A248' },
            ],
        },
        {
            title: '🧠 Concepts',
            skills: [
                { name: 'DSA', icon: null },
                { name: 'System Design', icon: null },
                { name: 'Microservices', icon: null },
                { name: 'REST API', icon: null },
            ],
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
                                        {skill.icon && (
                                            <img
                                                src={skill.icon}
                                                alt=""
                                                className={styles.skillIcon}
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        )}
                                        {skill.name}
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
