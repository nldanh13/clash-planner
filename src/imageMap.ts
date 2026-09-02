// File này do coc-admin/index.html xuất ra — KHÔNG sửa tay, mở admin tool
// (project riêng, xem coc-admin/README.txt) để chỉnh rồi xuất lại. Ghi đè
// URL ảnh remote cho từng item theo id; item nào không có ở đây thì
// App.tsx tự dùng nguồn mặc định (coc.guide cho công trình/phòng
// thủ/bẫy, assets.colinschmale.dev cho phần còn lại — xem remoteArt()
// trong src/App.tsx).
export const imageMap: Record<string,string> = {
  // (rỗng theo mặc định — mở coc-admin, gán ảnh riêng cho item nào cần rồi
  // xuất lại file này đè vào đây)
};
