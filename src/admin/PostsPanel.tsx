import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "../../shared/md.js";
import { api, uploadImage, type AdminPost } from "../lib/api";
import { useFeedback } from "./feedback";

type Draft = Pick<AdminPost, "title" | "slug" | "excerpt" | "tags" | "content" | "cover">;
const EMPTY: Draft = { title: "", slug: "", excerpt: "", tags: "", content: "", cover: "" };

export function PostsPanel() {
  const { toast, confirm } = useFeedback();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [current, setCurrent] = useState<AdminPost | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const open = (p: AdminPost | null) => {
    setCurrent(p);
    setDraft(p ? { title: p.title, slug: p.slug, excerpt: p.excerpt, tags: p.tags, content: p.content, cover: p.cover || "" } : EMPTY);
  };

  const load = useCallback(async (selectId?: number) => {
    const list = await api<AdminPost[]>("/api/admin/posts");
    setPosts(list);
    const pick = list.find((p) => p.id === selectId) ?? (selectId === undefined ? list[0] : null);
    open(pick ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (published: boolean) => {
    if (!draft.title.trim()) { toast("Add a title first"); document.getElementById("pTitle")?.focus(); return; }
    try {
      const body = { ...draft, published };
      const saved = current
        ? await api<AdminPost>(`/api/admin/posts/${current.id}`, "PUT", body)
        : await api<AdminPost>("/api/admin/posts", "POST", body);
      toast(published ? "Published ✓" : "Saved as draft ✓");
      load(saved.id);
    } catch (ex) { toast((ex as Error).message); }
  }, [draft, current, load, toast]);

  // Ctrl/Cmd + S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(current ? !!current.published : false); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [save, current]);

  const remove = async () => {
    if (!current || !(await confirm(`Delete “${current.title}”? This can't be undone.`))) return;
    await api(`/api/admin/posts/${current.id}`, "DELETE", {});
    toast("Deleted");
    load();
  };

  // ---------- Images ----------

  /** Inserts text where the cursor is in the editor */
  const insertAtCursor = (text: string) => {
    const pos = textRef.current?.selectionStart;
    setDraft((d) => {
      const at = pos ?? d.content.length;
      return { ...d, content: d.content.slice(0, at) + text + d.content.slice(at) };
    });
  };

  /** Uploads images (button, drag & drop or paste) and inserts Markdown for each one */
  const uploadFiles = async (files: FileList | File[]) => {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setUploading(true);
    try {
      for (const f of images) {
        const url = await uploadImage(f);
        const alt = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        insertAtCursor(`\n![${alt}](${url})\n`);
      }
      toast(images.length > 1 ? `${images.length} images added ✓` : "Image added ✓");
    } catch (ex) {
      toast((ex as Error).message);
    } finally {
      setUploading(false);
    }
  };

  /** Uploads one image and sets it as the post's cover */
  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft((d) => ({ ...d, cover: url }));
      toast("Cover added — save the post to keep it");
    } catch (ex) {
      toast((ex as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Without a chosen cover, the blog card uses the first image in the post
  const firstImage = (draft.content.match(/!\[[^\]]*\]\(([^)\s]+)\)/) || [])[1] || "";
  const coverShown = draft.cover || firstImage;

  const preview = useMemo(() => renderMarkdown(draft.content), [draft.content]);
  const field = (k: keyof Draft) => ({
    value: draft[k],
    onChange: (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value })),
  });

  return (
    <div className="split">
      <div className="card">
        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
          onClick={() => { open(null); document.getElementById("pTitle")?.focus(); }}
        >
          + New post
        </button>
        <ul className="plist">
          {posts.length === 0 && <li className="help">No posts yet.</li>}
          {posts.map((p) => (
            <li key={p.id}>
              <button className={current?.id === p.id ? "cur" : ""} onClick={() => open(p)}>
                <span><span className={`st ${p.published ? "pub" : "draft"}`}>{p.published ? "Live" : "Draft"}</span>{p.title}</span>
                <small>/blog/{p.slug} · edited {new Date(p.updated_at).toLocaleDateString()}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="row">
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="pTitle">Title</label>
            <input id="pTitle" maxLength={200} {...field("title")} />
          </div>
          <div className="field">
            <label htmlFor="pSlug">URL slug</label>
            <input id="pSlug" maxLength={80} placeholder="auto from title" {...field("slug")} />
          </div>
        </div>
        <div className="row">
          <div className="field" style={{ gridColumn: "span 2" }}>
            <label htmlFor="pExcerpt">Short summary (shown on cards)</label>
            <input id="pExcerpt" maxLength={400} {...field("excerpt")} />
          </div>
          <div className="field">
            <label htmlFor="pTags">Tags (comma-separated)</label>
            <input id="pTags" maxLength={200} placeholder="angular, nestjs" {...field("tags")} />
          </div>
        </div>

        <div className="cover-row">
          <div className="cover-thumb">
            {coverShown ? <img src={coverShown} alt="" /> : <span>No cover</span>}
          </div>
          <div>
            <label className="cover-label">Cover image (blog card &amp; link previews)</label>
            <p className="help" style={{ margin: "4px 0 10px" }}>
              {draft.cover ? "Custom cover." : firstImage ? "Using the first image in the post." : "Optional — 16:9 looks best."}
            </p>
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => coverRef.current?.click()} disabled={uploading}>
                {draft.cover ? "Change cover" : "Upload cover"}
              </button>
              {draft.cover && <button className="btn btn-ghost btn-sm" onClick={() => setDraft((d) => ({ ...d, cover: "" }))}>Remove</button>}
            </div>
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
            />
          </div>
        </div>

        <div className="ed-grid">
          <div className="field">
            <label htmlFor="pContent">Content (Markdown) — drop or paste images here</label>
            <textarea
              id="pContent"
              ref={textRef}
              {...field("content")}
              onPaste={(e) => {
                if (e.clipboardData.files.length) { e.preventDefault(); uploadFiles(e.clipboardData.files); }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (e.dataTransfer.files.length) { e.preventDefault(); uploadFiles(e.dataTransfer.files); }
              }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
          <div className="field">
            <label>Preview</label>
            <div className="preview">
              {preview
                ? <div className="prose" dangerouslySetInnerHTML={{ __html: preview }} />
                : <div className="prose"><p className="help">Start writing…</p></div>}
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => save(true)}>{current?.published ? "Update" : "Publish"}</button>
          <button className="btn btn-ghost" onClick={() => save(false)}>{current?.published ? "Unpublish" : "Save as draft"}</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Add image"}
          </button>
          {current?.published ? <a className="btn btn-ghost" href={`/blog/${current.slug}`} target="_blank" rel="noopener">Open post ↗</a> : null}
          {current && <button className="btn btn-ghost" style={{ marginLeft: "auto", color: "var(--danger)" }} onClick={remove}>Delete</button>}
        </div>
        <p className="help">
          Markdown: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>[link](https://…)</code>,{" "}
          <code>![image](https://…)</code>, <code>- list</code>, <code>&gt; quote</code>, <code>```code```</code>.
          Images: PNG, JPG, GIF or WebP, up to 5 MB.
        </p>
      </div>
    </div>
  );
}
