import type { Article, CreateArticlePayload, UpdateArticlePayload } from "@/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function handle<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || fallbackError);
  }
  return response.json();
}

export const articlesApi = {
  async listArticles(): Promise<Article[]> {
    const response = await fetch(`${API_BASE_URL}/api/articles`);
    return handle(response, "Failed to load articles");
  },

  async getArticle(articleId: string): Promise<Article> {
    const response = await fetch(`${API_BASE_URL}/api/articles/${articleId}`);
    return handle(response, "Failed to load article");
  },

  async adminListArticles(token: string): Promise<Article[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handle(response, "Failed to load articles");
  },

  async createArticle(payload: CreateArticlePayload, token: string): Promise<Article> {
    const response = await fetch(`${API_BASE_URL}/api/admin/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to create article");
  },

  async updateArticle(articleId: string, payload: UpdateArticlePayload, token: string): Promise<Article> {
    const response = await fetch(`${API_BASE_URL}/api/admin/articles/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return handle(response, "Failed to update article");
  },

  async togglePublished(articleId: string, isPublished: boolean, token: string): Promise<Article> {
    const response = await fetch(`${API_BASE_URL}/api/admin/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isPublished }),
    });
    return handle(response, "Failed to update article");
  },

  async deleteArticle(articleId: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/articles/${articleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to delete article");
    }
  },
};
