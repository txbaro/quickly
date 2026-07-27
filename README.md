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
