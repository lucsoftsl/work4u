"use client";

import { useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, GripVertical, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { articlesApi } from "@/lib/articles-api";
import type { Article } from "@/api/types";

export default function AdminBlogPage() {
  const { t } = useTranslation();
  const { user, firebaseToken } = useAuth();
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.userType !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (!firebaseToken || user?.userType !== "ADMIN") return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await articlesApi.adminListArticles(firebaseToken);
        setArticles(data);
      } catch (err) {
        console.error("Failed to load articles:", err);
        setError(t("adminBlog.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [firebaseToken, user?.userType, t]);

  async function handleTogglePublished(article: Article) {
    if (!firebaseToken) return;
    setActingOnId(article.id);
    try {
      const updated = await articlesApi.togglePublished(article.id, !article.isPublished, firebaseToken);
      setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      console.error("Failed to toggle article:", err);
      alert(err instanceof Error ? err.message : t("adminBlog.deleteError"));
    } finally {
      setActingOnId(null);
    }
  }

  async function handleDelete(article: Article) {
    if (!firebaseToken || !window.confirm(t("adminBlog.confirmDelete"))) return;
    setActingOnId(article.id);
    try {
      await articlesApi.deleteArticle(article.id, firebaseToken);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
    } catch (err) {
      console.error("Failed to delete article:", err);
      alert(err instanceof Error ? err.message : t("adminBlog.deleteError"));
    } finally {
      setActingOnId(null);
    }
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex || !firebaseToken) {
      setDragIndex(null);
      return;
    }

    const reordered = [...articles];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setArticles(reordered);
    setDragIndex(null);

    const token = firebaseToken;
    void Promise.all(
      reordered.map((article, index) =>
        article.displayOrder === index
          ? Promise.resolve()
          : articlesApi.updateArticle(article.id, { displayOrder: index }, token)
      )
    ).catch((err) => {
      console.error("Failed to persist article order:", err);
      alert(t("adminBlog.reorderError"));
    });
  }

  if (user?.userType !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="w-4 h-4" />
          {t("admin.backToDashboard")}
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("adminBlog.title")}</h1>
            <p className="text-muted-foreground">{t("adminBlog.subtitle")}</p>
          </div>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("adminBlog.newArticle")}
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-muted-foreground">{t("blog.loading")}</p>
        ) : error ? (
          <p className="mt-10 text-red-600 font-semibold">{error}</p>
        ) : articles.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-background p-10 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{t("adminBlog.empty")}</p>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white"
            >
              {t("adminBlog.createFirst")}
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-3">
            {articles.map((article, index) => (
              <div
                key={article.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event: DragEvent) => event.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4"
              >
                <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-muted-foreground" />
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-[#eff7fa]">
                  {article.coverImageUrl ? (
                    <Image src={article.coverImageUrl} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-brand/30">
                      <Newspaper className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{article.title}</p>
                  {article.excerpt && (
                    <p className="truncate text-sm text-muted-foreground">{article.excerpt}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    article.isPublished ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {article.isPublished ? t("adminBlog.published") : t("adminBlog.hidden")}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/blog/${article.id}/edit`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleTogglePublished(article)}
                    disabled={actingOnId === article.id}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {article.isPublished ? t("adminBlog.unpublish") : t("adminBlog.publish")}
                  </button>
                  <button
                    onClick={() => handleDelete(article)}
                    disabled={actingOnId === article.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
