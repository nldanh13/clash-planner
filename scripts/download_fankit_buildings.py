import time
from playwright.sync_api import sync_playwright

def download_assets():
    url = "https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets?asset-type97=Buildings"
    
    with sync_playwright() as p:
        try:
            # 1. Khởi tạo Playwright ở chế độ có giao diện
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()
            
            print(f"Đang truy cập: {url}")
            page.goto(url, wait_until="networkidle")
            
            # 2. Cuộn trang (Infinite Scroll)
            print("Đang cuộn trang để load tất cả hình ảnh...")
            last_height = page.evaluate("document.body.scrollHeight")
            while True:
                # Cuộn xuống cuối trang
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1.5)
                
                # Tính toán chiều cao mới
                new_height = page.evaluate("document.body.scrollHeight")
                if new_height == last_height:
                    print("Đã load xong toàn bộ trang.")
                    break
                last_height = new_height
            
            # 3. Click chọn ảnh
            print("Đang chọn tất cả các ảnh...")
            # Sử dụng data-test-id làm locator
            checkboxes = page.locator('button[data-test-id="library-item-card-checkbox"]')
            
            # Đợi các ô checkbox xuất hiện
            checkboxes.first.wait_for(state="attached")
            count = checkboxes.count()
            print(f"Tìm thấy {count} ảnh.")
            
            for i in range(count):
                checkboxes.nth(i).click(force=True)
                time.sleep(0.05)
            
            print("Đã chọn xong tất cả ảnh.")
            
            # 4. Click nút Download
            print("Đang chuẩn bị tải xuống...")
            download_btn = page.locator('button[data-test-id="bulk-assets-download-button"]')
            download_btn.wait_for(state="visible")
            
            # 5. Bắt file ZIP
            print("Đang chờ server nén file (có thể mất vài phút)...")
            with page.expect_download(timeout=120000) as download_info:
                download_btn.click()
            
            download = download_info.value
            download.save_as("ClashOfClans_Buildings.zip")
            print(f"Tải thành công! File được lưu tại: ClashOfClans_Buildings.zip")
            
        except Exception as e:
            print(f"Đã xảy ra lỗi: {e}")
            
        finally:
            if 'browser' in locals():
                browser.close()

if __name__ == "__main__":
    download_assets()
