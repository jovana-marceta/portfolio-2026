import { useEffect, useState } from "react";
import { api, type PostSummary } from "../../lib/api";
import { vars } from "../../lib/css";
import { fmtShortDate } from "../../lib/format";
import { SectionHeading } from "../ui/SectionHeading";
import "./Blog.css";

const SAMPLE: PostSummary = {
  slug: "",
  title: "Your first post will appear here",
  excerpt:
    "Sign in at /admin, write in Markdown and hit Publish - the newest six posts show up in this section.",
  tags: ["sample"],
  publishedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  minutes: 1,
  cover: "",
};

type State =
  | { status: "loading" }
  | { status: "ready"; posts: PostSummary[]; preview: boolean };

export function Blog() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    api<PostSummary[]>("/api/posts")
      .then((posts) => setState({ status: "ready", posts, preview: false }))
      .catch(() =>
        setState({ status: "ready", posts: [SAMPLE], preview: true }),
      );
  }, []);

  return (
    <section className='section' id='blog' aria-labelledby='blogTitle'>
      <div className='wrap'>
        <div className='blog-head'>
          <div>
            <SectionHeading
              id='blogTitle'
              index='05'
              label='Blog'
              lines={["Notes &", <em className='serif'>writing.</em>]}
            />
          </div>
          <a
            className='btn btn-ghost rv'
            href='/blog'
            style={{ marginBottom: "clamp(36px,6vh,64px)" }}>
            All posts →
          </a>
        </div>

        <ul
          className='posts'
          aria-live='polite'
          aria-busy={state.status === "loading"}>
          {state.status === "ready" && state.posts.length === 0 && (
            <li className='empty rv' style={{ gridColumn: "1 / -1" }}>
              The first post is on its way - check back soon.
            </li>
          )}
          {state.status === "ready" &&
            state.posts.slice(0, 6).map((p, i) => (
              <li
                className='pcard rv'
                style={vars({ "--i": i })}
                key={p.slug || i}>
                <a
                  href={p.slug ? `/blog/${p.slug}` : "#blog"}
                  className={p.cover ? "has-cover" : undefined}>
                  {p.cover && (
                    <span className='pcard-cover'>
                      <img src={p.cover} alt='' loading='lazy' />
                    </span>
                  )}
                  <span className='meta'>
                    {fmtShortDate(p.publishedAt)} · {p.minutes} min read
                    {state.preview && <span className='badge'>Sample</span>}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  {p.tags.length > 0 && (
                    <div className='tags'>
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  )}
                  <span className='read'>
                    Read post <span>→</span>
                  </span>
                </a>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
