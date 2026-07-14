import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#141414",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ width: 28, height: 28, background: "#e6392a" }} />
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1,
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
            }}
          >
            AwardWatch
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -3,
              color: "#ffffff",
            }}
          >
            <div>Design competition</div>
            <div>deadlines, tracked.</div>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Product · Graphic · UX/UI · Architecture · Interior · Sustainable
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
