import { Info, LoaderCircle } from "lucide-react";

export function EmptyPlayerState({ loading, message }: { loading: boolean, message?: string }) {
  return (
    <section className="empty-banner">
      {loading ? (
        <>
          <LoaderCircle className="spin" />
          <h1>Đang kết nối War Report…</h1>
        </>
      ) : (
        <>
          <Info />
          <h1>Chưa có dữ liệu người chơi</h1>
          <p>{message || `Nhập Player Tag ở trên rồi bấm "Tải tài khoản" để xem tình trạng làng, quân và hero.`}</p>
        </>
      )}
    </section>
  );
}
