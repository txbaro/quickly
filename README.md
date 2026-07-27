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

## Biến môi trường khi deploy

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Có thể deploy thẳng lên Vercel hoặc bất kỳ nền tảng hỗ trợ Next.js. Policy mẫu cho
phép mọi người đọc và thêm câu hỏi; với ứng dụng public thật, nên bật Supabase Auth
và giới hạn quyền thêm câu hỏi cho tài khoản quản trị.
