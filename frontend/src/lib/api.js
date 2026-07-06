const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Fetch wrapper cho Backend API.
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// === Analytics ===

export async function getOverview() {
  return fetchAPI("/api/analytics/overview");
}

export async function getTopProducts(metric = "avg_rating", limit = 10) {
  return fetchAPI(`/api/analytics/top-products?metric=${metric}&limit=${limit}`);
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

export async function getPriceHistory(productId) {
  return fetchAPI(`/api/analytics/price-history/${productId}`);
}

export async function getPriceVolatility({ limit = 20, suspiciousOnly = false } = {}) {
  return fetchAPI(`/api/analytics/price-volatility?limit=${limit}&suspicious_only=${suspiciousOnly}`);
}

// === Products ===

export async function getProducts({ page = 1, pageSize = 20, search = "", sortBy = "avg_rating", sortOrder = "desc" } = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  if (search) params.set("search", search);
  return fetchAPI(`/api/products?${params.toString()}`);
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
