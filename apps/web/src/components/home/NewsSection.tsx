interface NewsItem {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  url: string;
  tag: "news" | "review" | "release";
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "The Most Anticipated Games of 2026",
    summary: "A roundup of the biggest releases coming this year, from AAA blockbusters to indie gems.",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    source: "IGN",
    publishedAt: "2026-03-25",
    url: "#",
    tag: "news",
  },
  {
    id: "2",
    title: "Elden Ring: Shadow of the Erdtree — A Year Later",
    summary: "How FromSoftware's massive DLC reshaped what we expect from expansions, and why it still dominates conversations.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    source: "Eurogamer",
    publishedAt: "2026-03-20",
    url: "#",
    tag: "review",
  },
  {
    id: "3",
    title: "GTA VI Release Date Officially Confirmed",
    summary: "Rockstar Games has finally locked in the release window. Here's everything we know about the biggest launch of the decade.",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
    source: "Kotaku",
    publishedAt: "2026-03-18",
    url: "#",
    tag: "release",
  },
  {
    id: "4",
    title: "The Rise of Indie RPGs in 2026",
    summary: "Small studios are punching above their weight. We look at the indie titles redefining the RPG genre this year.",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
    source: "PC Gamer",
    publishedAt: "2026-03-15",
    url: "#",
    tag: "news",
  },
];

const TAG_STYLES: Record<NewsItem["tag"], { color: string; bg: string }> = {
  news:    { color: "#00e5ff", bg: "rgba(0,229,255,0.1)" },
  review:  { color: "#7b61ff", bg: "rgba(123,97,255,0.1)" },
  release: { color: "#ff9800", bg: "rgba(255,152,0,0.1)" },
};

export function NewsSection() {
  return (
    <section style={{ padding: "64px 24px", maxWidth: "1200px", margin: "0 auto" }} id="news">
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "22px", fontWeight: 700,
        color: "#e8eaf0", margin: "0 0 32px",
        letterSpacing: "1px",
      }}>
        Gaming News
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "20px",
      }}>
        {MOCK_NEWS.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              overflow: "hidden",
              textDecoration: "none",
              transition: "border-color 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,229,255,0.3)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <div style={{ height: "160px", overflow: "hidden", background: "#0d1117" }}>
              <img
                src={item.imageUrl}
                alt={item.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              />
            </div>

            <div style={{ padding: "16px" }}>
              <span style={{
                display: "inline-block",
                fontSize: "10px", fontWeight: 700,
                letterSpacing: "1px",
                padding: "2px 8px",
                borderRadius: "4px",
                color: TAG_STYLES[item.tag].color,
                background: TAG_STYLES[item.tag].bg,
                marginBottom: "8px",
              }}>
                {item.tag.toUpperCase()}
              </span>

              <h3 style={{
                fontSize: "14px", fontWeight: 600,
                color: "#e8eaf0", margin: "0 0 8px",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {item.title}
              </h3>

              <p style={{
                fontSize: "12px", color: "#4a5468",
                margin: "0 0 12px", lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}>
                {item.summary}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4a5468" }}>
                <span>{item.source}</span>
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
