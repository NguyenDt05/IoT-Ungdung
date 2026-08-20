# Hệ thống giám sát và điều khiển thiết bị IoT

Workspace được tách thành hai ứng dụng độc lập:

```text
IoT-Ungdung/
├── backend/
│   ├── sql/
│   │   └── recommended_indexes.sql
│   ├── src/
│   │   ├── config/          # MySQL pool và MQTT client
│   │   ├── controllers/     # HTTP request/response, query và validation
│   │   ├── middleware/      # 404 và error handler tập trung
│   │   ├── routes/          # Khai báo REST endpoints
│   │   ├── services/        # MQTT ingestion, ACK và timeout
│   │   ├── utils/           # AppError và pagination helper
│   │   ├── app.js           # Express application
│   │   └── server.js        # Bootstrap và graceful shutdown
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/        # Nơi tập trung axios/API calls
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Chạy dự án

Yêu cầu Node.js 18+, MySQL và Mosquitto đang chạy.

```powershell
cd backend
Copy-Item .env.example .env
# Sửa thông tin DB trong .env
npm install
npm run dev
```

Mở terminal thứ hai:

```powershell
cd frontend
npm install
npm run dev
```

Vite proxy `/api` sang `http://localhost:3001`, vì vậy frontend không cần hard-code
backend URL khi chạy local.

## REST API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Health check của HTTP process |
| GET | `/api/dashboard` | Giá trị mới nhất, độ tươi dữ liệu và trạng thái thiết bị |
| POST | `/api/devices/control` | Body `{ "deviceId": 1, "command": "ON" }`; trả HTTP 202 |
| GET | `/api/data-sensor` | `keyword`, `type`, `page`, `limit` |
| GET | `/api/action-history` | `keyword`, `page`, `limit` |
| GET | `/api/profile` | User tĩnh cấu hình qua `.env` |

`page` bắt đầu từ 1; `limit` từ 1 đến 100. `type` nhận `temperature`,
`humidity` hoặc `light`.

## MQTT contract

Backend subscribe `sensor/data`. Phần cứng có thể gửi một trong các dạng sau:

```json
{"temperature": 28.5, "humidity": 70, "light": 350}
```

```json
{"readings": [{"sensorId": 1, "value": 28.5}, {"sensorId": 2, "value": 70}]}
```

Khi REST API nhận lệnh, backend publish lên `device/control`:

```json
{"actionId": 125, "deviceId": 1, "command": "ON"}
```

Phần cứng phải echo đúng correlation ID lên `device/status` trong 10 giây:

```json
{"actionId": 125, "deviceId": 1, "status": "ON"}
```

ACK hợp lệ cập nhật `action_history=SUCCESS` và `devices.status` trong cùng một
transaction. ACK sai, trùng hoặc đến sau timeout bị bỏ qua. Nếu không có ACK,
chỉ `action_history` đổi thành `FAILED`; trạng thái thiết bị được giữ nguyên.

Để test nhanh với Mosquitto CLI:

```powershell
mosquitto_sub -h localhost -t device/control -v
mosquitto_pub -h localhost -t sensor/data -m '{"temperature":28.5,"humidity":70,"light":350}'
mosquitto_pub -h localhost -t device/status -m '{"actionId":1,"deviceId":1,"status":"ON"}'
```

## Chuẩn hóa frontend

- Component chỉ nên render UI; mọi `axios` call đặt trong `src/services`.
- Hook chịu trách nhiệm polling mỗi 2 giây, cleanup interval khi unmount và giữ
  dữ liệu cuối cùng khi backend tạm mất kết nối.
- Các trang lịch sử dùng pagination từ server, không tải toàn bộ dữ liệu rồi lọc
  trong trình duyệt.
- Lệnh điều khiển trả `PENDING`; UI không nên đổi trạng thái thiết bị ngay. Chỉ
  hiển thị trạng thái mới sau khi lần polling dashboard thấy ACK đã cập nhật DB.
- Dùng biến môi trường `VITE_API_BASE_URL` nếu deploy frontend/backend khác domain;
  khi local có thể tiếp tục dùng Vite proxy hiện tại.
