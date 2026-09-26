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

      {/* ...unchanged <style jsx> block... */}
    </div>
  );
}
