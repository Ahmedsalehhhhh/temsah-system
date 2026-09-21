# Golden Streamers — Payroll API

Backend حقيقي بـ Node.js + Express + MongoDB، بديل ملف Base.xlsx بالكامل. نفس منطق الحساب اللي في الفرونت اند بالظبط (مع نفس التصحيحات: Rate كـ fraction، وTier 2 bug متصلح).

## التشغيل

1. لازم MongoDB (محلي أو Atlas مجاني https://www.mongodb.com/cloud/atlas)
2. ```
   cp .env.example .env
   ```
   واملأ `MONGO_URI` و `JWT_SECRET` (أي نص عشوائي طويل)
3. ```
   npm install
   npm run seed   # بيانات تجريبية (فترة رواتب + شوية ستريمرز/ريكروترز)
   npm run dev
   ```
   السيرفر هيشتغل على `http://localhost:5000`

## الأوثنتيكيشن
- أول واحد يعمل `POST /api/auth/register` بياخد role **admin** أوتوماتيك، أي حد بعده staff.
- بعد كده اللوجين عادي بـ `POST /api/auth/login` وترجع JWT تحطه في `Authorization: Bearer <token>`.
- الأدمن بس اللي يقدر يعدل الإعدادات، يضيف/يمسح ستريمرز وريكروترز وموظفين، ويفتح/يقفل فترات الرواتب.
- أي مستخدم مسجل دخول (staff/admin) يقدر يدخل بيانات الأداء الشهرية (Score/Days/Hours، سجل الريكروتينج، Tier counts).

## أهم الـ Endpoints

| Method | Route | الوظيفة |
|---|---|---|
| POST | /api/auth/register, /login | تسجيل / دخول |
| GET/PATCH | /api/settings | إعدادات الحساب العامة (Tiers، B4، قواعد الستريمرز) |
| GET/POST | /api/periods | فترات الرواتب |
| PATCH | /api/periods/:id/close | قفل فترة (تصبح read-only) |
| GET/POST/PATCH/DELETE | /api/streamers | الستريمرز (Master data) |
| PUT | /api/streamers/performance/:periodId/:streamerId | أداء الستريمر في فترة معينة |
| GET/POST/DELETE | /api/recruiters | الريكروترز |
| GET/POST/DELETE | /api/recruiting-records/:periodId | سجل الريكروتينج |
| PUT | /api/recruiters/adjustments/:periodId/:recruiterId | بونص/خصم الريكروتر |
| GET/POST/DELETE | /api/employees/:dept | موظفين الإدارة/IT (`dept` = management أو it) |
| PUT | /api/employees/:dept/rows/:periodId/:employeeId | Tier counts وبونص/خصم الموظف |
| **GET** | **/api/payroll/overview/:periodId** | **كل حسابات المرتبات جاهزة (بديل Salary Overview)** |

## فترات مقفولة = بيانات محفوظة
أي محاولة تعديل بيانات شهرية (أداء، سجل ريكروتينج، Tier counts) في فترة status=closed بترجع 409. البيانات القديمة تفضل زي ما هي حتى لو غيرت الـ Rate أو الإعدادات بعدين.

## الخطوة الجاية
وصل الفرونت اند (golden-streamers) بالـ API ده بدل localStorage: `fetch`/`axios` + صفحة Login + تخزين الـ token، وبعدين نستبدل حسابات `src/lib/calc.js` المحلية بقراءة `/api/payroll/overview/:periodId` مباشرة.
