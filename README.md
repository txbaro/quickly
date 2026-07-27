# Quizly Clone

Ứng dụng trắc nghiệm tối giản bằng Next.js và Supabase.

## Chạy local

1. Tạo project tại Supabase.
2. Mở **SQL Editor**, chạy toàn bộ file `supabase/schema.sql`.
3. Sao chép `.env.example` thành `.env.local` và điền Project URL + anon key.
4. Chạy:

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

Nếu project Supabase đã được tạo từ phiên bản cũ, hãy chạy lại toàn bộ
`supabase/schema.sql` để bổ sung policy cho chức năng sửa và xóa câu hỏi. Script có
thể chạy lại an toàn vì dùng `if not exists` và thay thế các policy theo tên.

## Import câu hỏi

Trong **Quản lý câu hỏi**, chọn **Import file**. Ứng dụng hỗ trợ JSON, CSV, TSV và
TXT tối đa 5 MB, kiểm tra dữ liệu trước khi lưu và tự bỏ qua câu hỏi trùng.

- JSON dùng `question`, mảng `answers` gồm 4 phần tử và `correct_answer` từ 0–3.
- CSV/TSV dùng các cột `question`, `answer_a`, `answer_b`, `answer_c`, `answer_d`,
  `correct_answer`.
- `correct_answer` chấp nhận `0–3` hoặc `A–D`.
- `id` và `created_at` không cần nhập vì Supabase tự tạo.

File mẫu nằm tại `examples/questions.json` và `examples/questions.csv`.

## Deploy lên Vercel

1. Đẩy repository lên GitHub/GitLab/Bitbucket.
2. Trong Vercel, chọn **Add New → Project** và import repository.
3. Giữ nguyên framework preset **Next.js** và build command mặc định `npm run build`.
4. Trong **Environment Variables**, thêm cho cả Production, Preview và Development:

   ```text
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. Nhấn **Deploy**. Sau khi thay đổi biến môi trường, cần redeploy để giá trị
   `NEXT_PUBLIC_*` được đóng gói vào client bundle.

Không đưa `.env.local` lên Git; file này đã nằm trong `.gitignore`.

## Kiểm tra trước khi deploy

```bash
npm ci
npm run check
npm run build
```

Policy SQL mẫu cho phép mọi người đọc và thêm câu hỏi. Với ứng dụng public thật,
nên bật Supabase Auth và giới hạn quyền thêm câu hỏi cho tài khoản quản trị để
tránh người lạ spam kho câu hỏi.

Nếu cần deploy lại lên OpenAI Sites/Cloudflare Worker, dùng `npm run build:sites`
thay cho build mặc định của Vercel.
