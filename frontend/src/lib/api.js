import { ApiError, NetworkError, NotFoundError, ServerError, ValidationError } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch wrapper cho Backend API — với error classification.
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (err) {
    // Network error (server down, CORS, DNS, etc.)
    throw new NetworkError();
  }

  if (!res.ok) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      // Response is not JSON
    }

    if (res.status === 404) {
      throw new NotFoundError(body.detail || "Không tìm thấy tài nguyên.");
    }
    if (res.status === 422) {
      throw new ValidationError(body.error || "Dữ liệu không hợp lệ.", body.detail || []);
    }
    if (res.status >= 500) {
      throw new ServerError(
        body.message || "Lỗi phía server.",
        body.error_id || null,
      );
    }
    throw new ApiError(res.status, body.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

/**
 * Build query string from an object, skipping null/undefined values.
 */
function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      q.set(key, String(value));
    }
  }
  const str = q.toString();
  return str ? `?${str}` : "";
}

// === Analytics ===

export async function getOverview(filters = {}) {
  const query = buildQuery({
    keyword: filters.keyword,
    min_price: filters.min_price,
    max_price: filters.max_price,
  });
  return fetchAPI(`/api/analytics/overview${query}`);
}

export async function getTopProducts(metric = "avg_rating", limit = 10, filters = {}) {
  const query = buildQuery({
    metric,
    limit,
    keyword: filters.keyword,
    min_price: filters.min_price,
    max_price: filters.max_price,
  });
  return fetchAPI(`/api/analytics/top-products${query}`);
}

export async function getRatingDistribution() {
  return fetchAPI("/api/analytics/rating-distribution");
}

export async function getSentimentOverview() {
  return fetchAPI("/api/analytics/sentiment-overview");
}

export async function getKeywordStats() {
  return fetchAPI("/api/analytics/keyword-stats");
}

export async function getNegativeTopics() {
  return fetchAPI("/api/analytics/negative-topics");
}

export async function getPriceVolatility(limit = 20, suspiciousOnly = false) {
  const query = buildQuery({ limit, suspicious_only: suspiciousOnly });
  return fetchAPI(`/api/analytics/price-volatility${query}`);
}

export async function getPriceHistory(productId) {
  return fetchAPI(`/api/analytics/price-history/${productId}`);
}

// === Products ===

export async function getProducts({
  page = 1,
  pageSize = 20,
  search = "",
  sortBy = "avg_rating",
  sortOrder = "desc",
  keyword = null,
  minPrice = null,
  maxPrice = null,
} = {}) {
  const query = buildQuery({
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
    search: search || null,
    keyword,
    min_price: minPrice,
    max_price: maxPrice,
  });
  return fetchAPI(`/api/products${query}`);
}

export async function getProductById(productId) {
  return fetchAPI(`/api/products/${productId}`);
}

export async function getProductReviews(productId) {
  return fetchAPI(`/api/products/${productId}/reviews`);
}

// === System ===

export async function getHealth() {
  return fetchAPI("/api/health");
}

export async function getDataStatus() {
  return fetchAPI("/api/analytics/data-status");
}
