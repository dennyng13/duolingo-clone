# 🪩 Lingo Dance — gõ từ tiếng Anh theo nhịp nhạc

Trò chơi nhảy theo nhạc để học từ vựng tiếng Anh, chơi nhiều người cùng lúc. Mỗi nhịp
nhạc hiện ra một từ: học sinh **gõ đúng từ tiếng Anh** rồi **nhấn Enter đúng lúc quả bóng
chạm vòng vàng**. Đúng chính tả + đúng nhịp thì nhân vật hoạt hình của em sẽ nhảy
(PERFECT / GREAT / COOL). Sai chính tả hoặc lỡ nhịp thì nhân vật bị vấp (MISS).

Trang: `/dance` (có thêm mục **Dance** ở thanh bên trái). Học sinh không cần tài khoản,
chỉ cần đặt tên và chọn nhân vật.

## Chạy thử nhanh

```bash
bun install
bun run dev            # ứng dụng Next.js ở http://localhost:3000
bun run dance:server   # máy chủ nhiều người chơi ở ws://localhost:3001 (terminal thứ hai)
```

- **Luyện tập một mình (cùng bot)**: không cần máy chủ, mở `/dance` là chơi được ngay.
- **Tạo phòng / Vào phòng**: cần `bun run dance:server` đang chạy.

## Dùng trong lớp học (cùng mạng Wi-Fi)

1. Máy giáo viên chạy cả hai lệnh ở trên. Cả hai đều lắng nghe trên mọi địa chỉ mạng; lệnh
   `dance:server` in ra địa chỉ LAN, ví dụ `ws://192.168.1.20:3001`.
2. Giáo viên mở `http://localhost:3000/dance` → **Tạo phòng mới** → có **mã phòng** 4 ký tự
   và đường link mời.
3. Học sinh mở `http://192.168.1.20:3000/dance` (thay bằng IP máy giáo viên), nhập mã
   phòng → **Vào phòng**. Trình duyệt tự kết nối tới máy chủ trên cùng máy (cổng 3001).
4. Giáo viên có thể tick **Chỉ xem** để chiếu sân khấu lên màn hình lớn mà không tham
   gia nhảy. Màn hình này hiện từ trước đó và số bạn trả lời đúng.
5. Chọn chủ đề, bài nhạc, độ khó, kiểu chơi, số từ → **Bắt đầu nhảy!**

Nếu máy giáo viên có tường lửa, hãy cho phép cổng `3000` và `3001`.

## Tuỳ chọn trong phòng chờ (chủ phòng)

| Tuỳ chọn  | Lựa chọn                                                                                      |
| --------- | --------------------------------------------------------------------------------------------- |
| Chủ đề    | 12 chủ đề có sẵn (động vật, đồ ăn, màu sắc, trường học…), trộn tất cả, hoặc **tự nhập**       |
| Bài nhạc  | 4 bài nhạc gốc được tạo trực tiếp bằng Web Audio (96–124 BPM), không dùng file nhạc bản quyền |
| Độ khó    | Dễ (12 nhịp/từ, gợi ý chữ đầu) · Vừa (8 nhịp, gợi ý số chữ) · Khó (6 nhịp, không gợi ý)       |
| Kiểu chơi | Nhìn nghĩa → gõ từ · Nghe → gõ từ (máy đọc, luyện chính tả) · Nhìn từ → gõ lại (cho bé)       |
| Số từ     | 8 / 12 / 16 / 20 / 24                                                                         |
| Bot       | Thêm tối đa 8 bot cho đông vui                                                                |

**Danh sách tự nhập**: mỗi dòng một từ, dạng `từ tiếng Anh = nghĩa = emoji` (emoji không bắt
buộc). Dùng `/` cho nhiều cách viết đúng:

```text
apple = quả táo = 🍎
happy = vui vẻ
grey/gray = màu xám
```

## Cách tính điểm

- Thời điểm nhấn Enter so với nhịp đích: PERFECT 100, GREAT 70, COOL 40, BAD 10, MISS 0.
- Combo (PERFECT/GREAT/COOL liên tiếp) cộng thêm +10 mỗi từ, tối đa +100.
- Nhấn Enter quá sớm chỉ hiện nhắc "Chưa tới nhịp!" và không mất lượt.
- Kết thúc bài: bục vinh danh, bảng điểm (điểm, số từ đúng, perfect, combo) và danh sách
  **Từ cần ôn lại** của riêng mỗi học sinh, có nút nghe phát âm.

## Triển khai lên Internet

Ứng dụng Next.js triển khai lên Vercel như bình thường. Vercel không chạy được máy chủ
WebSocket lâu dài, nên hãy chạy `server/dance-server.ts` trên một dịch vụ Node có hỗ trợ
WebSocket (Render, Railway, Fly.io, VPS…):

```bash
npx tsx server/dance-server.ts   # cổng lấy từ DANCE_PORT hoặc PORT, mặc định 3001
```

Sau đó đặt biến môi trường cho ứng dụng Next.js (dùng `wss://` khi trang chạy https):

```env
NEXT_PUBLIC_DANCE_SERVER_URL=wss://dance.example.com
```

Người chơi cũng có thể nhập địa chỉ máy chủ thủ công ở mục **Máy chủ nhiều người chơi**
trên trang `/dance`.

## Cấu trúc mã nguồn

```text
app/dance/               trang /dance + CSS hoạt hình nhân vật, sân khấu
components/dance/        giao diện: menu, phòng chờ, màn chơi, kết quả, nhân vật SVG
lib/dance/rules.ts       nhịp, cửa sổ chấm điểm, độ khó, điểm
lib/dance/room.ts        logic phòng (dùng chung cho máy chủ và chế độ luyện tập)
lib/dance/audio.ts       bộ phát nhạc Web Audio + hiệu ứng âm thanh
lib/dance/words.ts       bộ từ vựng, kiểm tra đáp án, đọc danh sách tự nhập
lib/dance/store.ts       trạng thái phía trình duyệt (zustand)
server/dance-server.ts   máy chủ WebSocket nhiều người chơi
```

Đồng bộ thời gian: máy chủ gửi thời điểm bắt đầu bài; mỗi trình duyệt ước lượng độ lệch
đồng hồ bằng ping, nên nhạc và nhịp chấm điểm của mọi người khớp nhau. Mỗi máy tự chấm
điểm cho chính mình rồi gửi kết quả lên máy chủ để cập nhật bảng điểm và cho nhân vật nhảy
trên màn hình của mọi người.
