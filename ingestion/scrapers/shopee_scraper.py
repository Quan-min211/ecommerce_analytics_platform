"""
Shopee Scraper — Thu thập dữ liệu sản phẩm từ Shopee.vn

Sử dụng Playwright CDP (Chrome DevTools Protocol) để:
1. Kết nối tới Chrome đang mở sẵn (có session đăng nhập)
2. Điều hướng tới trang tìm kiếm Shopee
3. Intercept API responses nội bộ (search_items, get_ratings)
4. Parse và validate data bằng Pydantic schemas

Cách dùng:
    # Mở Chrome trước: chrome.exe --remote-debugging-port=9222
    with ShopeeScraper() as scraper:
        products = scraper.scrape_products("bàn phím cơ", max_pages=2)
"""

import random
import time
import threading
from typing import Any, Optional
from urllib.parse import quote

from loguru import logger
from playwright.sync_api import sync_playwright, Browser, Page, Response

from ingestion.scrapers.base_scraper import BaseScraper
from ingestion.schemas.product_schema import ProductSchema
from ingestion.schemas.review_schema import ReviewSchema
from ingestion.config import get_settings


class ShopeeScraper(BaseScraper):
    """Scraper cho Shopee.vn sử dụng Playwright CDP.

    Kết nối tới Chrome đã mở sẵn qua CDP port, intercept
    internal API responses để lấy dữ liệu sản phẩm.

    Attributes:
        cdp_url: URL kết nối CDP (default: http://localhost:9222)
        request_delay: Delay giữa các request (giây)
    """

    # Shopee API patterns để intercept
    API_SEARCH_ITEMS = "search_items"
    API_GET_ITEM = "item/get"
    API_GET_RATINGS = "get_ratings"

    def __init__(
        self,
        cdp_url: Optional[str] = None,
        request_delay: Optional[float] = None,
    ):
        super().__init__(platform="shopee")

        settings = get_settings()
        self.cdp_url = cdp_url or settings.CHROME_CDP_URL
        self.request_delay = request_delay or settings.REQUEST_DELAY_SECONDS

        # Retry & backoff settings
        self.max_retries: int = 3
        self.api_wait_timeout: int = 20  # seconds to wait for API response
        self._consecutive_failures: int = 0

        # Playwright instances
        self._playwright = None
        self._browser: Optional[Browser] = None

        # Data collection buffer
        self._collected_items: list[dict] = []
        self._data_received = threading.Event()

    def connect(self) -> None:
        """Kết nối tới Chrome qua CDP.

        Chrome phải được mở sẵn với flag:
            chrome.exe --remote-debugging-port=9222
        """
        self.logger.info(f"Đang kết nối tới Chrome tại {self.cdp_url}...")

        self._playwright = sync_playwright().start()

        try:
            self._browser = self._playwright.chromium.connect_over_cdp(self.cdp_url)
            self.logger.success(f"✅ Đã kết nối thành công tới Chrome (CDP)")
        except Exception as e:
            self.logger.error(
                f"❌ Không thể kết nối tới Chrome tại {self.cdp_url}. "
                f"Hãy mở Chrome với: chrome.exe --remote-debugging-port=9222"
            )
            if self._playwright:
                self._playwright.stop()
            raise ConnectionError(f"Cannot connect to Chrome CDP: {e}") from e

    def close(self) -> None:
        """Đóng kết nối Playwright (không đóng Chrome)."""
        if self._playwright:
            self._playwright.stop()
            self._playwright = None
            self._browser = None
            self.logger.info("Đã đóng kết nối Playwright")

    def _handle_search_response(self, response: Response, keyword: str) -> None:
        """Callback xử lý API response từ Shopee search_items.

        Được gọi tự động khi page nhận response chứa search_items.
        Parse items và validate bằng ProductSchema.
        """
        if self.API_SEARCH_ITEMS not in response.url:
            return
        if response.status != 200:
            return

        try:
            data = response.json()
            items = data.get("items", [])

            if not items:
                return

            self.logger.info(f"📦 Intercepted {len(items)} items từ API search_items")

            for item_data in items:
                try:
                    product = ProductSchema.from_shopee_item(item_data, keyword=keyword)
                    self._collected_items.append(product.model_dump(mode="json"))
                except Exception as e:
                    self.logger.warning(f"⚠️ Skip item (validation failed): {e}")

            # Signal rằng đã nhận được data
            self._data_received.set()

        except Exception as e:
            self.logger.debug(f"Không thể parse response: {e}")

    def _handle_ratings_response(
        self, response: Response, shop_id: int, item_id: int, reviews_list: list, event: threading.Event
    ) -> None:
        """Callback xử lý API response từ Shopee get_ratings."""
        if self.API_GET_RATINGS not in response.url:
            return
        if response.status != 200:
            return

        try:
            data = response.json()
            ratings = data.get("data", {}).get("ratings")
            if not ratings:
                return

            for r in ratings:
                try:
                    review_obj = ReviewSchema.from_shopee_rating(r, item_id, shop_id)
                    reviews_list.append(review_obj.model_dump(mode="json"))
                except Exception as e:
                    self.logger.warning(f"⚠️ Skip review (validation failed): {e}")

            # Đã nhận được mẻ review đầu tiên (thường là 50 cái)
            event.set()

        except Exception as e:
            self.logger.debug(f"Không thể parse ratings response: {e}")

    def _wait_for_antibot(self, page: Page, max_wait: int = 90, check_interval: int = 3) -> bool:
        """Smart anti-bot wait: poll cho đến khi phát hiện trang đã load xong.

        Thay vì chờ cứng 60 giây, kiểm tra mỗi `check_interval` giây xem
        search bar hoặc product grid đã xuất hiện chưa.

        Args:
            page: Playwright page instance
            max_wait: Thời gian chờ tối đa (giây)
            check_interval: Khoảng cách giữa mỗi lần kiểm tra (giây)

        Returns:
            True nếu trang đã sẵn sàng, False nếu hết thời gian chờ.
        """
        # Các selector cho biết trang đã qua anti-bot
        ready_selectors = [
            "input.shopee-searchbar-input__input",  # Search bar
            ".shopee-search-item-result__items",     # Product grid
            "[data-sqe='item']",                     # Product cards
        ]

        self.logger.info(f"🛡️ Chờ anti-bot/CAPTCHA (tối đa {max_wait}s, kiểm tra mỗi {check_interval}s)...")
        elapsed = 0

        while elapsed < max_wait:
            for selector in ready_selectors:
                try:
                    if page.query_selector(selector):
                        self.logger.success(f"✅ Trang đã sẵn sàng (phát hiện: {selector}) sau {elapsed}s")
                        return True
                except Exception:
                    pass

            page.wait_for_timeout(check_interval * 1000)
            elapsed += check_interval

            if elapsed % 15 == 0:
                self.logger.info(f"⏳ Vẫn đang chờ anti-bot... ({elapsed}/{max_wait}s)")

        self.logger.warning(f"⚠️ Hết thời gian chờ anti-bot ({max_wait}s). Tiếp tục dù có thể chưa sẵn sàng.")
        return False

    def _get_adaptive_delay(self, base_delay: float) -> float:
        """Tính delay thích ứng dựa trên số lần thất bại liên tiếp.

        Exponential backoff với jitter để tránh pattern detection:
        - 0 failures: base_delay (e.g. 2s)
        - 1 failure:  base_delay * 2 + jitter (e.g. 4-5s)
        - 2 failures: base_delay * 4 + jitter (e.g. 8-10s)
        - 3+ failures: cap tại base_delay * 8 + jitter (e.g. 16-20s)
        """
        multiplier = min(2 ** self._consecutive_failures, 8)
        jitter = random.uniform(0, base_delay * 0.5)
        delay = base_delay * multiplier + jitter
        return round(delay, 1)

    def _navigate_with_retry(
        self, page: Page, url: str, page_num: int, max_retries: int = None
    ) -> bool:
        """Navigate tới URL với retry logic.

        Nếu API response không tới trong thời gian chờ, retry với
        exponential backoff. Mỗi lần retry reload lại trang.

        Args:
            page: Playwright page
            url: URL cần navigate
            page_num: Số trang hiện tại (để log)
            max_retries: Số lần retry tối đa

        Returns:
            True nếu nhận được data, False nếu hết retry.
        """
        retries = max_retries if max_retries is not None else self.max_retries

        for attempt in range(retries + 1):
            self._data_received.clear()

            try:
                if attempt > 0:
                    retry_delay = self._get_adaptive_delay(self.request_delay)
                    self.logger.info(
                        f"🔄 Retry {attempt}/{retries} cho trang {page_num + 1} "
                        f"(chờ {retry_delay}s trước khi thử lại)..."
                    )
                    time.sleep(retry_delay)
                    page.reload(wait_until="domcontentloaded", timeout=30000)
                else:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)

                # Chờ API response
                self._data_received.wait(timeout=self.api_wait_timeout)

                if self._data_received.is_set():
                    self._consecutive_failures = 0  # Reset on success
                    return True

                self.logger.warning(
                    f"⏳ Timeout chờ API response trang {page_num + 1} "
                    f"(attempt {attempt + 1}/{retries + 1})"
                )
                self._consecutive_failures += 1

            except Exception as e:
                self.logger.error(f"❌ Lỗi navigate trang {page_num + 1} (attempt {attempt + 1}): {e}")
                self._consecutive_failures += 1

        self.logger.error(f"❌ Đã hết {retries} lần retry cho trang {page_num + 1}. Bỏ qua trang này.")
        return False

    def scrape_products(self, keyword: str, max_pages: int = 1) -> list[dict[str, Any]]:
        """Thu thập sản phẩm theo keyword từ Shopee.

        Có retry logic, exponential backoff, và smart anti-bot wait.

        Args:
            keyword: Từ khóa tìm kiếm (VD: "bàn phím cơ")
            max_pages: Số trang tối đa cần crawl (mỗi trang ~60 items)

        Returns:
            List of product dicts (đã validate bằng ProductSchema)
        """
        if not self._browser:
            raise RuntimeError("Chưa kết nối. Gọi connect() trước hoặc dùng context manager.")

        self.logger.info(f"🔍 Bắt đầu scrape: keyword='{keyword}', max_pages={max_pages}")

        # Reset collection buffer & failure counter
        self._collected_items = []
        self._consecutive_failures = 0

        context = self._browser.contexts[0]
        # Sử dụng tab có sẵn đầu tiên, hoặc tạo mới nếu chưa có
        page: Page = context.pages[0] if context.pages else context.new_page()

        # Gắn listener để intercept API responses (chỉ gắn 1 lần)
        page.on(
            "response",
            lambda resp, kw=keyword: self._handle_search_response(resp, kw),
        )

        for page_num in range(max_pages):
            # Build search URL với pagination
            search_url = (
                f"https://shopee.vn/search?keyword={quote(keyword)}"
                f"&page={page_num}"
            )

            self.logger.info(
                f"📄 Trang {page_num + 1}/{max_pages}: {search_url}"
            )

            try:
                if page_num == 0:
                    self.logger.info("👉 Mô phỏng thao tác người dùng: Vào trang chủ và nhập từ khóa tìm kiếm...")
                    page.goto("https://shopee.vn/", wait_until="domcontentloaded", timeout=60000)

                    # Smart anti-bot wait: poll thay vì chờ cứng
                    self._wait_for_antibot(page, max_wait=90)

                    try:
                        page.wait_for_selector("input.shopee-searchbar-input__input", timeout=10000)
                        page.fill("input.shopee-searchbar-input__input", keyword)
                        page.press("input.shopee-searchbar-input__input", "Enter")

                        # Smart wait sau khi search: chờ product grid xuất hiện
                        self._wait_for_antibot(page, max_wait=90)
                    except Exception as e:
                        self.logger.warning(f"⚠️ Không tìm thấy ô tìm kiếm, chuyển qua URL tĩnh... {e}")
                        self._navigate_with_retry(page, search_url, page_num)

                    # Chờ API response cho trang đầu tiên
                    self._data_received.wait(timeout=self.api_wait_timeout)
                    if self._data_received.is_set():
                        self._consecutive_failures = 0
                    else:
                        self._consecutive_failures += 1
                        self.logger.warning("⏳ Không nhận được API response cho trang đầu tiên")
                else:
                    # Trang 2+: navigate với retry logic
                    self._navigate_with_retry(page, search_url, page_num)

                # Scroll xuống để trigger thêm API calls (lazy loading)
                self._scroll_page(page)

                # Chờ thêm chút để bắt hết API calls
                page.wait_for_timeout(3000)

            except Exception as e:
                self.logger.error(f"❌ Lỗi trang {page_num + 1}: {e}")
                self._consecutive_failures += 1

            # Adaptive delay giữa các pages (exponential backoff)
            if page_num < max_pages - 1:
                delay = self._get_adaptive_delay(self.request_delay)
                self.logger.debug(f"⏱️ Adaptive delay {delay}s trước trang tiếp (failures={self._consecutive_failures})...")
                time.sleep(delay)

        self.logger.success(
            f"✅ Hoàn tất scrape '{keyword}': {len(self._collected_items)} sản phẩm"
        )

        return self._collected_items

    def _scroll_page(self, page: Page, scroll_count: int = 3) -> None:
        """Scroll trang xuống để trigger lazy-loading API calls.

        Args:
            page: Playwright page instance
            scroll_count: Số lần scroll
        """
        for i in range(scroll_count):
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            page.wait_for_timeout(1000)

    def scrape_multiple_keywords(
        self, keywords: list[str], max_pages: int = 1
    ) -> dict[str, list[dict[str, Any]]]:
        """Thu thập sản phẩm cho nhiều keywords.

        Args:
            keywords: Danh sách keywords
            max_pages: Số trang tối đa per keyword

        Returns:
            Dict mapping keyword → list of product dicts
        """
        results = {}
        total = len(keywords)

        for i, keyword in enumerate(keywords, 1):
            self.logger.info(f"📋 [{i}/{total}] Keyword: '{keyword}'")
            products = self.scrape_products(keyword, max_pages=max_pages)
            results[keyword] = products

            # Delay giữa các keywords
            if i < total:
                delay = self.request_delay * 2  # Longer delay giữa keywords
                self.logger.debug(f"⏱️ Delay {delay}s giữa keywords...")
                time.sleep(delay)

        total_products = sum(len(v) for v in results.values())
        self.logger.success(
            f"✅ Hoàn tất scrape {total} keywords: tổng {total_products} sản phẩm"
        )

        return results

    def scrape_reviews(self, shop_id: int, item_id: int, max_reviews: int = 100) -> list[dict[str, Any]]:
        """Thu thập danh sách đánh giá của một sản phẩm.

        Sử dụng Network Interception thay vì fetch() để qua mặt anti-bot Shopee.

        Args:
            shop_id: ID của shop
            item_id: ID của sản phẩm
            max_reviews: Số lượng đánh giá tối đa

        Returns:
            List of raw review dicts
        """
        if not self._browser:
            raise RuntimeError("Chưa kết nối. Gọi connect() trước.")

        self.logger.info(f"⭐ Bắt đầu scrape reviews: item_id={item_id}")
        
        context = self._browser.contexts[0]
        page = context.new_page()
        reviews = []
        event = threading.Event()
        
        # Gắn listener
        page.on(
            "response",
            lambda resp: self._handle_ratings_response(resp, shop_id, item_id, reviews, event),
        )
        
        product_url = f"https://shopee.vn/product/{shop_id}/{item_id}"
        
        try:
            page.goto(product_url, wait_until="domcontentloaded", timeout=30000)
            
            # Scroll xuống phần Đánh giá để kích hoạt API get_ratings
            for _ in range(5):
                page.evaluate("window.scrollBy(0, 1000)")
                page.wait_for_timeout(1000)
                if event.is_set():
                    break
                    
            event.wait(timeout=10)
            
        except Exception as e:
            self.logger.warning(f"Lỗi khi mở trang sản phẩm: {e}")
        finally:
            page.close()
            
        # Giới hạn số lượng
        final_reviews = reviews[:max_reviews]
        self.logger.success(f"✅ Đã cào {len(final_reviews)} reviews cho item {item_id}")
        return final_reviews

    def scrape_products_with_reviews(
        self, keyword: str, max_pages: int = 1, max_reviews: int = 100
    ) -> tuple[list[dict], list[dict]]:
        """Thu thập cả sản phẩm lẫn reviews cho sản phẩm đó.
        
        Returns:
            Tuple (danh sách products, danh sách tất cả reviews)
        """
        products = []
        all_reviews = []
        
        try:
            products = self.scrape_products(keyword, max_pages)
        except Exception as e:
            self.logger.error(f"❌ Lỗi nghiêm trọng khi cào sản phẩm (Dừng sớm): {e}")
            # Lấy lại những gì đã cào được trước khi lỗi
            products = self._collected_items
            
        if not products:
            self.logger.warning("⚠️ Không có sản phẩm nào được cào, kết thúc sớm.")
            return products, all_reviews
            
        total = len(products)
        self.logger.info(f"🔄 Sẽ cào reviews cho {total} sản phẩm vừa tìm được...")
        
        for i, prod in enumerate(products, 1):
            shop_id = prod.get("shop_id")
            item_id = prod.get("product_id")
            
            if not shop_id or not item_id:
                continue
                
            self.logger.info(f"[{i}/{total}] Sản phẩm: {prod.get('name', '')[:30]}...")
            
            try:
                reviews = self.scrape_reviews(shop_id, item_id, max_reviews)
                all_reviews.extend(reviews)
            except Exception as e:
                self.logger.error(f"❌ Lỗi nghiêm trọng khi cào reviews (Dừng sớm): {e}")
                break  # Thoát vòng lặp reviews nếu gặp lỗi lớn (ví dụ mất kết nối)
            
            if i < total:
                time.sleep(self.request_delay)
                
        return products, all_reviews
