# StayZ Web

Project dành cho phiên bản web StayZ. Frontend và backend hoạt động độc lập.

## Cấu trúc

- `frontend/`: Next.js App Router, TypeScript và Tailwind CSS.
- `backend/`: Express API dùng chung cho web và ứng dụng Flutter.

## Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định gọi API production. Tạo `frontend/.env.local` để đổi API:

```env
NEXT_PUBLIC_STAYZ_API_URL=http://localhost:3000/api
```

## Chạy backend

Sao chép `backend/.env.example` thành `backend/.env`, điền cấu hình rồi chạy:

```bash
cd backend
npm install
npm run dev
```

Không commit file `.env` hoặc khóa bí mật.
