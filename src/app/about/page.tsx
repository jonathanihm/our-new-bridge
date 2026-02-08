"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './about.module.css'

const GITHUB_REPO_URL = 'https://github.com/jonathanihm/our-new-bridge'

export default function AboutPage() {
  const tabs = useMemo(
    () =>
      [
        { id: 'helping' as const, label: 'Helping' },
        { id: 'run-your-own' as const, label: 'Run your own version' },
      ] as const,
    []
  )

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('helping')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.homeLink}>
            Our New Bridge
          </Link>
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>About</h1>
          <p className={styles.subtitle}>A simple, humane platform for finding essential resources.</p>
        </section>

        <section className={styles.section} aria-labelledby="mission">
          <h2 id="mission" className={styles.sectionTitle}>Mission</h2>
          <p className={styles.paragraph}>
            Our mission is to make it fast and dignified to find help—food, shelter, housing, and legal resources—without
            hunting through outdated lists.
          </p>
          <p className={styles.paragraph}>
            Communities are always changing. This project is built so that regular people can keep information up to date.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="get-involved">
          <h2 id="get-involved" className={styles.sectionTitle}>Get involved</h2>

          <div className={styles.tabs} role="tablist" aria-label="Ways to get involved">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                className={activeTab === t.id ? styles.tabButtonActive : styles.tabButton}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'helping' && (
            <div
              className={styles.panel}
              role="tabpanel"
              id="panel-helping"
              aria-labelledby="tab-helping"
            >
              <h3 className={styles.panelTitle}>Helping</h3>
              <p className={styles.paragraph}>
                The biggest impact comes from keeping listings accurate and adding new places as they open.
              </p>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Volunteer by calling</h4>
                  <p className={styles.paragraph}>
                    Pick a few locations and confirm: address, hours, days open, phone number, and any requirements.
                  </p>
                </div>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Volunteer by updating locations</h4>
                  <p className={styles.paragraph}>
                    Use the Admin Dashboard to quickly add/edit resources. Small updates keep the map trustworthy.
                  </p>
                </div>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Help create new areas</h4>
                  <p className={styles.paragraph}>
                    Start a new city/area and add the first batch of resources so others can build on it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'run-your-own' && (
            <div
              className={styles.panel}
              role="tabpanel"
              id="panel-run-your-own"
              aria-labelledby="tab-run-your-own"
            >
              <h3 className={styles.panelTitle}>Run your own version</h3>
              <p className={styles.paragraph}>
                Want to bring this to your community with your own name, your own cities, and your own partners? You can run
                your own version—fully branded, tailored to your area, and managed by the people closest to the need.
              </p>

              <div className={styles.grid}>
                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Make it yours</h4>
                  <p className={styles.paragraph}>
                    Use your logo, colors, and language. Focus on what matters locally and keep the experience simple. This project is MIT licensed so you can just run with it.
                  </p>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Stay in control</h4>
                  <p className={styles.paragraph}>
                    Own your data and decide how updates happen—whether it’s a small volunteer team or a bigger network.
                  </p>
                </div>

                <div className={styles.card}>
                  <h4 className={styles.cardTitle}>Go live with confidence</h4>
                  <p className={styles.paragraph}>
                    Launch on the hosting provider you already use and keep improving as your community grows.
                  </p>
                </div>
              </div>

              <p className={styles.callout}>
                If you’re ready to run your own version, start with the project README on{' '}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Help should be easy.</p>
      </footer>
    </div>
  )
}
