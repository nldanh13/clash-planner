export function readStoredRecord<T>(key: string): Record<string, T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, T>;
    }
  } catch {
    // Xóa dữ liệu hỏng để các lần mở sau không tiếp tục đọc lại cùng lỗi.
  }
  localStorage.removeItem(key);
  return {};
}

export function writeStoredRecord<T>(key: string, data: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(data));
}
