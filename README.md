# StayZ Web

Monorepo dành cho phiên bản web StayZ.

## Cấu trúc

- `frontend/`: Next.js App Router, TypeScript và Tailwind CSS.
- `backend/`: Express API dùng chung cho web và ứng dụng Flutter.

## Chạy frontend

```bash
npm install
npm run dev:frontend
```

Frontend mặc định gọi API production. Tạo `frontend/.env.local` để đổi API:

```env
NEXT_PUBLIC_STAYZ_API_URL=http://localhost:3000/api
```

## Chạy backend

Sao chép `backend/.env.example` thành `backend/.env`, điền cấu hình rồi chạy:

```bash
npm install
npm run dev:backend
```

Không commit file `.env` hoặc khóa bí mật.
