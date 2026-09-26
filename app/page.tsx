"use client";

import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export default function Home() {
  return (
    <div className={`${grotesk.variable} ${plexMono.variable} root`}>
      <header className="topbar">
        <span className="wordmark">cufx</span>
      </header>

      <main className="hero">
        <h1>One link in. Every format out.</h1>
        <p className="sub">
          Edit video and photo, or pull media straight from a URL — one toolkit,
          no switching apps.
        </p>
      </main>

      <div className="cards">
        <Link href="/editor" className="card">
          <span className="swatch" />
          <span className="cardBody">
            <span className="cardTitle">Editor</span>
            <span className="cardDesc">
              Trim, filter, adjust, and compress — video and photo in one place.
            </span>
          </span>
        </Link>

        <Link href="/extract" className="card">
          <span className="swatch swatchAlt" />
          <span className="cardBody">
            <span className="cardTitle">Extract</span>
            <span className="cardDesc">
              Pull video, audio, or a full playlist from any link.
            </span>
          </span>
        </Link>
      </div>

      <footer className="footer">
        <span>Next.js · ffmpeg · sharp · yt-dlp</span>
      </footer>

      <style jsx>{`
        .root {
          --bg: #f6f6f3;
          --surface: #ffffff;
          --border: #e3e3df;
          --ink: #14171a;
          --ink-soft: #5b6065;
          --accent: #2f5fed;
          font-family: var(--font-sans), system-ui, sans-serif;
          color: var(--ink);
          background: var(--bg);
          max-width: 560px;
          margin: 0 auto;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 0 20px;
        }

        .topbar {
          padding: 20px 0 8px;
        }
        .wordmark {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .hero {
          padding: 36px 0 28px;
        }
        .hero h1 {
          font-size: 32px;
          line-height: 1.15;
          font-weight: 600;
          margin: 0 0 12px;
          letter-spacing: -0.01em;
        }
        .sub {
          font-size: 15px;
          line-height: 1.5;
          color: var(--ink-soft);
          margin: 0;
          max-width: 42ch;
        }

        .cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          text-decoration: none;
          color: inherit;
        }
        .swatch {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
          background: linear-gradient(155deg, #3a4a7a 0%, #b8618f 42%, #f2a34f 78%, #ffd98e 100%);
        }
        .swatchAlt {
          background: linear-gradient(155deg, #2f5fed 0%, #6c8bff 55%, #b9c8ff 100%);
        }
        .cardBody {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .cardTitle {
          font-size: 15px;
          font-weight: 600;
        }
        .cardDesc {
          font-size: 12.5px;
          line-height: 1.4;
          color: var(--ink-soft);
        }

        .footer {
          margin-top: auto;
          padding: 40px 0 28px;
          font-family: var(--font-mono), monospace;
          font-size: 11.5px;
          color: var(--ink-soft);
        }

        @media (min-width: 640px) {
          .hero h1 {
            font-size: 38px;
          }
        }
      `}</style>
    </div>
  );
}
