import { RECOMMENDATIONS_URL, TESTIMONIALS, type Testimonial } from "../../data/testimonials";
import { vars } from "../../lib/css";
import { SectionHeading } from "../ui/SectionHeading";
import "./Testimonials.css";

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("");

/** Wraps the highlight phrase (if present) in a <mark>. */
function Paragraph({ text, highlight }: { text: string; highlight?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at < 0) return <p>{text}</p>;
  return (
    <p>
      {text.slice(0, at)}
      <mark>{highlight}</mark>
      {text.slice(at + highlight!.length)}
    </p>
  );
}

function QuoteCard({ t, i }: { t: Testimonial; i: number }) {
  return (
    <figure className="quote-card rv" style={vars({ "--i": i })}>
      <span className="quote-mark" aria-hidden="true">“</span>
      <blockquote>
        {t.paragraphs.map((p) => <Paragraph key={p} text={p} highlight={t.highlight} />)}
      </blockquote>
      <figcaption>
        <span className="quote-avatar" aria-hidden="true">{initials(t.name)}</span>
        <span className="quote-who">
          <strong>{t.name}</strong>
          <span>{t.role}</span>
          <small>{t.relation} · {t.date}</small>
        </span>
      </figcaption>
    </figure>
  );
}

/** Recommendations from colleagues. */
export function Testimonials() {
  return (
    <section className="section" id="kind-words" aria-labelledby="kindTitle">
      <div className="wrap">
        <div className="kind-head">
          <div>
            <SectionHeading id="kindTitle" index="04" label="Recommendations" lines={["Kind words from", <em className="serif">colleagues.</em>]} />
          </div>
          <a className="btn btn-ghost rv" href={RECOMMENDATIONS_URL} target="_blank" rel="noopener" style={{ marginBottom: "clamp(36px,6vh,64px)" }}>
            See on LinkedIn ↗
          </a>
        </div>
        <div className="quotes">
          {TESTIMONIALS.map((t, i) => <QuoteCard key={t.name} t={t} i={i} />)}
        </div>
      </div>
    </section>
  );
}
