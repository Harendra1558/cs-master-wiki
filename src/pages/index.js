import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

// Animated Background
function AnimatedBackground() {
    return (
        <div className={styles.animatedBg}>
            <div className={styles.gradientOrb1}></div>
            <div className={styles.gradientOrb2}></div>
            <div className={styles.gradientOrb3}></div>
            <div className={styles.gridOverlay}></div>
        </div>
    );
}

// Navigation Dots
function NavDots() {
    const sections = ['hero', 'about', 'experience', 'skills', 'projects', 'contact'];
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 3;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={styles.navDots}>
            {sections.map((section) => (
                <a
                    key={section}
                    href={`#${section}`}
                    className={clsx(styles.navDot, activeSection === section && styles.navDotActive)}
                    aria-label={`Navigate to ${section}`}
                >
                    <span className={styles.navDotLabel}>{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                </a>
            ))}
        </nav>
    );
}

// Hero Section
function Hero() {
    const roles = ['Software Engineer', 'Backend Specialist', 'System Design Enthusiast'];
    const [currentRole, setCurrentRole] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentRole((prev) => (prev + 1) % roles.length);
                setIsVisible(true);
            }, 500);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className={styles.hero} id="hero">
            <AnimatedBackground />
            <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                    <div className={styles.heroTag}>
                        <span className={styles.statusDot}></span>
                        Available for opportunities
                    </div>
                    <h1 className={styles.heroName}>
                        <span className={styles.greeting}>Hello, I'm</span>
                        <span className={styles.name}>Harendra</span>
                    </h1>
                    <div className={styles.roleWrapper}>
                        <span className={clsx(styles.role, isVisible && styles.roleVisible)}>
                            {roles[currentRole]}
                        </span>
                    </div>
                    <p className={styles.heroDescription}>
                        Building scalable backend systems with <span className={styles.highlight}>Java</span>,
                        <span className={styles.highlight}> Spring Boot</span>, and
                        <span className={styles.highlight}> Microservices</span>.
                        Passionate about clean architecture and high-performance applications.
                    </p>
                    <div className={styles.heroCtas}>
                        <Link to="/docs" className={styles.primaryBtn}>
                            <span>Explore My Work</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <a href="https://drive.google.com/file/d/1aFKAM-ZU8xbPwqrADwt0FwaFVfOf_zXq/view?usp=drive_link"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.secondaryBtn}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            <span>Download CV</span>
                        </a>
                    </div>
                    <div className={styles.socialLinks}>
                        <a href="https://github.com/Harendra1558" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="GitHub">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                        </a>
                        <a href="https://www.linkedin.com/in/harendra1558/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="LinkedIn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                        </a>
                        <a href="mailto:harendrakumar1558@gmail.com" className={styles.socialLink} aria-label="Email">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                            </svg>
                        </a>
                        <a href="https://leetcode.com/u/Harendra1558/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="LeetCode">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
                            </svg>
                        </a>
                    </div>
                </div>
                <div className={styles.heroRight}>
                    <div className={styles.heroCard}>
                        <div className={styles.codeWindow}>
                            <div className={styles.windowHeader}>
                                <div className={styles.windowDots}>
                                    <span className={styles.dotRed}></span>
                                    <span className={styles.dotYellow}></span>
                                    <span className={styles.dotGreen}></span>
                                </div>
                                <span className={styles.fileName}>Harendra.java</span>
                            </div>
                            <pre className={styles.codeContent}>
                                <code>
                                    {`public class Harendra {
    
    private String role = "Programmer Analyst";
    private int experience = 3; // years
    private String company = "Finagg";
    
    public String[] getSkills() {
        return new String[] {
            "Java", "Spring Boot",
            "Microservices", "AWS",
            "System Design", "DSA"
        };
    }
    
    public boolean isAvailable() {
        return true; // Let's connect!
    }
}`}
                                </code>
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.scrollIndicator}>
                <span>Scroll to explore</span>
                <div className={styles.scrollMouse}>
                    <div className={styles.scrollWheel}></div>
                </div>
            </div>
        </section>
    );
}

// About Section
function About() {
    const stats = [
        { number: '3', label: 'Years Experience', icon: '💼' },
        { number: '400+', label: 'DSA Problems', icon: '🧩' },
        { number: '1612', label: 'LeetCode Rating', icon: '🏆' },
        { number: '10+', label: 'Projects Built', icon: '🚀' },
    ];

    return (
        <section className={styles.section} id="about">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>About Me</span>
                    <h2 className={styles.sectionTitle}>Crafting Digital Experiences</h2>
                    <p className={styles.sectionSubtitle}>
                        A passionate engineer who loves turning complex problems into elegant solutions
                    </p>
                </div>

                <div className={styles.aboutGrid}>
                    <div className={styles.aboutContent}>
                        <div className={styles.aboutCard}>
                            <h3>My Journey</h3>
                            <p>
                                I'm a <strong>Programmer Analyst at Finagg</strong> with 3 years of experience specializing in
                                backend development. Currently building <strong>FameScore</strong> and <strong>FameReport</strong> -
                                innovative influence analytics platforms for brands and influencers.
                            </p>
                            <p>
                                Previously at <strong>UGRO Capital</strong>, I built scalable fintech applications
                                processing millions of transactions. My expertise lies in <strong>Java, Spring Boot,
                                    and Microservices architecture</strong>.
                            </p>
                            <p>
                                When I'm not coding, you'll find me solving algorithmic challenges on LeetCode
                                or exploring new technologies to stay ahead of the curve.
                            </p>
                        </div>

                        <div className={styles.techStack}>
                            <h4>Current Tech Stack</h4>
                            <div className={styles.techIcons}>
                                {['Java', 'Spring', 'AWS', 'Docker', 'PostgreSQL', 'Redis'].map((tech) => (
                                    <span key={tech} className={styles.techBadge}>{tech}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.statsGrid}>
                        {stats.map((stat, idx) => (
                            <div key={idx} className={styles.statCard}>
                                <span className={styles.statIcon}>{stat.icon}</span>
                                <span className={styles.statNumber}>{stat.number}</span>
                                <span className={styles.statLabel}>{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Experience Section
function Experience() {
    const experiences = [
        {
            company: 'Finagg',
            role: 'Programmer Analyst',
            period: 'May 2025 – Present',
            location: 'India',
            description: 'Building innovative fintech products for influence analytics',
            highlights: [
                'Developing FameScore - A comprehensive influence analytics platform (famescore.in)',
                'Building FameReport - Detailed influencer reporting and analytics solution',
                'Architecting scalable backend systems for real-time data processing',
                'Implementing robust APIs for social media analytics integration',
                'Collaborating with cross-functional teams to deliver high-quality products',
            ],
            technologies: ['Java', 'Spring Boot', 'Microservices', 'AWS', 'PostgreSQL', 'Redis'],
            links: [
                { label: 'FameScore', url: 'https://famescore.in/' }
            ]
        },
        {
            company: 'UGRO Capital',
            role: 'Software Engineer',
            period: 'Feb 2023 – May 2025',
            location: 'India',
            description: 'Built next-generation fintech solutions for lending operations',
            highlights: [
                'Developed and managed Loan Origination System (LOS) and Loan Management System (LMS)',
                'Led integration of third-party APIs (GST, CIBIL, TransUnion, Perfios) using Reactive Java',
                'Improved API performance by reducing latency by 50% through multithreading optimization',
                'Implemented RSA/AES hybrid encryption for secure communication',
                'Designed CI/CD pipelines using Docker, Jenkins, and AWS ECS',
                'Collaborated with security teams to ensure RBI compliance',
            ],
            technologies: ['Java', 'Spring Boot', 'AWS', 'Docker', 'MySQL', 'Redis'],
        },
    ];

    return (
        <section className={clsx(styles.section, styles.sectionAlt)} id="experience">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>Experience</span>
                    <h2 className={styles.sectionTitle}>Where I've Worked</h2>
                    <p className={styles.sectionSubtitle}>
                        Building impactful solutions at scale
                    </p>
                </div>

                <div className={styles.experienceTimeline}>
                    {experiences.map((exp, idx) => (
                        <div key={idx} className={styles.experienceCard}>
                            <div className={styles.expHeader}>
                                <div className={styles.expCompany}>
                                    <div className={styles.companyLogo}>
                                        {exp.company.charAt(0)}
                                    </div>
                                    <div>
                                        <h3>{exp.role}</h3>
                                        <span className={styles.companyName}>{exp.company}</span>
                                    </div>
                                </div>
                                <div className={styles.expMeta}>
                                    <span className={styles.expPeriod}>{exp.period}</span>
                                    <span className={styles.expLocation}>{exp.location}</span>
                                </div>
                            </div>
                            <p className={styles.expDescription}>{exp.description}</p>
                            <ul className={styles.expHighlights}>
                                {exp.highlights.map((highlight, hIdx) => (
                                    <li key={hIdx}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                            <div className={styles.expTech}>
                                {exp.technologies.map((tech, tIdx) => (
                                    <span key={tIdx} className={styles.expTechTag}>{tech}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Skills Section
function Skills() {
    const skillCategories = [
        {
            title: 'Languages',
            icon: '💻',
            skills: [
                { name: 'Java', level: 95 },
                { name: 'JavaScript', level: 75 },
                { name: 'SQL', level: 85 },
                { name: 'Python', level: 60 },
            ],
        },
        {
            title: 'Frameworks',
            icon: '🔧',
            skills: [
                { name: 'Spring Boot', level: 90 },
                { name: 'Spring MVC', level: 85 },
                { name: 'Hibernate', level: 80 },
                { name: 'React', level: 65 },
            ],
        },
        {
            title: 'Cloud & DevOps',
            icon: '☁️',
            skills: [
                { name: 'AWS', level: 80 },
                { name: 'Docker', level: 85 },
                { name: 'Kubernetes', level: 70 },
                { name: 'Jenkins', level: 75 },
            ],
        },
        {
            title: 'Databases',
            icon: '🗄️',
            skills: [
                { name: 'MySQL', level: 90 },
                { name: 'PostgreSQL', level: 85 },
                { name: 'Redis', level: 80 },
                { name: 'MongoDB', level: 70 },
            ],
        },
    ];

    const concepts = [
        'System Design', 'Microservices', 'REST APIs', 'Data Structures',
        'Algorithms', 'Design Patterns', 'SOLID Principles', 'Clean Architecture',
        'Distributed Systems', 'Message Queues', 'Caching Strategies', 'API Security'
    ];

    return (
        <section className={styles.section} id="skills">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>Skills</span>
                    <h2 className={styles.sectionTitle}>My Technical Arsenal</h2>
                    <p className={styles.sectionSubtitle}>
                        Technologies and tools I use to bring ideas to life
                    </p>
                </div>

                <div className={styles.skillsGrid}>
                    {skillCategories.map((category, idx) => (
                        <div key={idx} className={styles.skillCard}>
                            <div className={styles.skillCardHeader}>
                                <span className={styles.skillIcon}>{category.icon}</span>
                                <h3>{category.title}</h3>
                            </div>
                            <div className={styles.skillsList}>
                                {category.skills.map((skill, sIdx) => (
                                    <div key={sIdx} className={styles.skillItem}>
                                        <div className={styles.skillInfo}>
                                            <span>{skill.name}</span>
                                            <span>{skill.level}%</span>
                                        </div>
                                        <div className={styles.skillBar}>
                                            <div
                                                className={styles.skillProgress}
                                                style={{ width: `${skill.level}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.conceptsSection}>
                    <h3>Core Concepts & Expertise</h3>
                    <div className={styles.conceptsTags}>
                        {concepts.map((concept, idx) => (
                            <span key={idx} className={styles.conceptTag}>{concept}</span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Projects Section
function Projects() {
    const projects = [
        {
            title: 'FameScore',
            description: 'A comprehensive influence analytics platform that measures social media influence and provides detailed scoring metrics. Real-time analytics for brands and influencers.',
            tech: ['Java', 'Spring Boot', 'PostgreSQL', 'AWS', 'Redis'],
            github: null,
            demo: 'https://famescore.in/',
            featured: true,
            icon: '⭐',
        },
        {
            title: 'FameReport',
            description: 'Detailed influencer reporting and analytics solution. Generates comprehensive reports on social media performance, engagement metrics, and audience insights.',
            tech: ['Java', 'Spring Boot', 'Microservices', 'AWS'],
            github: null,
            demo: null,
            featured: true,
            icon: '📊',
        },
        {
            title: 'URL Shortener with QR Code',
            description: 'A robust URL shortening service with custom aliases, expiration dates, and customizable QR code generation. Features analytics tracking for monitoring user engagement.',
            tech: ['Java', 'Spring Boot', 'MySQL', 'React', 'Redis'],
            github: 'https://github.com/Harendra1558',
            demo: null,
            featured: false,
            icon: '🔗',
        },
        {
            title: 'CS Fundamentals Wiki',
            description: 'Comprehensive documentation covering JVM internals, DBMS optimization, Spring Boot, distributed systems, and more. A one-stop resource for interview preparation.',
            tech: ['Docusaurus', 'React', 'Mermaid', 'Markdown'],
            github: 'https://github.com/Harendra1558/cs-master-wiki',
            demo: '/docs',
            featured: false,
            icon: '📚',
        },
        {
            title: 'Loan Management System',
            description: 'Enterprise-grade loan origination and management system handling end-to-end loan lifecycle. Integrated with multiple third-party services for verification.',
            tech: ['Java', 'Spring Boot', 'AWS', 'PostgreSQL'],
            github: null,
            demo: null,
            featured: false,
            icon: '💰',
        },
        {
            title: 'Multi-Threaded HTTP Server & MVC Framework',
            description: 'High-performance HTTP/1.1 Web Server built from scratch in Java 21, bypassing standard containers. Features a custom MVC framework with a reflection-based annotation engine (@GetMapping) mimicking Spring Boot. Uses a fixed thread pool architecture for concurrent request handling.',
            tech: ['Java 21', 'Multithreading', 'Reflection API', 'Java I/O'],
            github: 'https://github.com/Harendra1558',
            demo: null,
            featured: false,
            icon: '⚡',
        },
    ];

    return (
        <section className={clsx(styles.section, styles.sectionAlt)} id="projects">
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <span className={styles.sectionTag}>Projects</span>
                    <h2 className={styles.sectionTitle}>Featured Work</h2>
                    <p className={styles.sectionSubtitle}>
                        A selection of projects I've built and contributed to
                    </p>
                </div>

                <div className={styles.projectsGrid}>
                    {projects.map((project, idx) => (
                        <div key={idx} className={clsx(styles.projectCard, project.featured && styles.projectFeatured)}>
                            <div className={styles.projectIcon}>{project.icon}</div>
                            <h3>{project.title}</h3>
                            <p>{project.description}</p>
                            <div className={styles.projectTech}>
                                {project.tech.map((tech, tIdx) => (
                                    <span key={tIdx}>{tech}</span>
                                ))}
                            </div>
                            <div className={styles.projectLinks}>
                                {project.github && (
                                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                        Code
                                    </a>
                                )}
                                {project.demo && (
                                    <Link to={project.demo}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                                        </svg>
                                        Demo
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.moreProjects}>
                    <a href="https://github.com/Harendra1558" target="_blank" rel="noopener noreferrer" className={styles.viewAllBtn}>
                        View All Projects on GitHub
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}

// Contact Section
function Contact() {
    const contactMethods = [
        {
            icon: '📧',
            label: 'Email',
            value: 'harendrakumar1558@gmail.com',
            href: 'mailto:harendrakumar1558@gmail.com',
        },
        {
            icon: '💼',
            label: 'LinkedIn',
            value: 'Connect with me',
            href: 'https://www.linkedin.com/in/harendra1558/',
        },
        {
            icon: '💻',
            label: 'GitHub',
            value: '@Harendra1558',
            href: 'https://github.com/Harendra1558',
        },
    ];

    return (
        <section className={styles.contactSection} id="contact">
            <div className={styles.container}>
                <div className={styles.contactContent}>
                    <div className={styles.contactInfo}>
                        <span className={styles.sectionTag}>Get In Touch</span>
                        <h2 className={styles.contactTitle}>Let's Build Something Amazing Together</h2>
                        <p className={styles.contactDescription}>
                            I'm always open to discussing new opportunities, interesting projects,
                            or just having a chat about technology. Feel free to reach out!
                        </p>

                        <div className={styles.contactMethods}>
                            {contactMethods.map((method, idx) => (
                                <a key={idx} href={method.href} target="_blank" rel="noopener noreferrer" className={styles.contactMethod}>
                                    <span className={styles.contactIcon}>{method.icon}</span>
                                    <div>
                                        <span className={styles.contactLabel}>{method.label}</span>
                                        <span className={styles.contactValue}>{method.value}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className={styles.contactVisual}>
                        <div className={styles.contactCard}>
                            <div className={styles.contactCardInner}>
                                <span className={styles.contactEmoji}>🚀</span>
                                <h3>Ready to collaborate?</h3>
                                <p>Let's discuss scalable backend architectures, fintech solutions, or your next big project.</p>
                                <a href="mailto:harendrakumar1558@gmail.com" className={styles.contactCta}>
                                    Send Message
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Scroll to Top Button
function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            setIsVisible(window.scrollY > 500);
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            className={clsx(styles.scrollToTop, isVisible && styles.scrollToTopVisible)}
            onClick={scrollToTop}
            aria-label="Scroll to top"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 15l-6-6-6 6" />
            </svg>
        </button>
    );
}

// Main Component
export default function Home() {
    const { siteConfig } = useDocusaurusContext();

    return (
        <Layout
            title="Harendra - Software Engineer"
            description="Portfolio of Harendra, a Software Engineer specializing in Java, Spring Boot, and Microservices. Building scalable backend systems.">
            <main className={styles.main}>
                <NavDots />
                <Hero />
                <About />
                <Experience />
                <Skills />
                <Projects />
                <Contact />
                <ScrollToTop />
            </main>
        </Layout>
    );
}
