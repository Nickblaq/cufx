export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>cufx</h1>
      <p>Next.js calling Python via subprocess. Test endpoints:</p>
      <ul>
        <li><a href="/api/hello-py">/api/hello-py</a></li>
        <li><a href="/api/ytdlp-check">/api/ytdlp-check</a></li>
      </ul>
    </main>
  );
}
