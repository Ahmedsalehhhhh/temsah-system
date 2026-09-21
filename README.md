# Golden Streamers — Payroll

## Internal TikTok support assistant

The application includes an authenticated Arabic support assistant for agency employees. It uses a local, source-linked TikTok knowledge base by default and can add AI-generated answers when `OPENAI_API_KEY` is configured on the server. Keep that key in the hosting environment only; never add it to client code or commit it to GitHub.

Optional environment variables:

- `OPENAI_API_KEY`: enables AI answers and screenshot analysis.
- `OPENAI_MODEL`: model used by the assistant (defaults to `gpt-5-mini`).

Without these variables, question matching, official sources, troubleshooting steps, and escalation to Problems remain available.

نظام رواتب كامل (Frontend + Backend) بديل ملف Base.xlsx، لفريق Golden Streamers (Streamers / Recruiters / Management / IT).

```
golden-streamers/
├── client/   # Angular (standalone + signals) + Tailwind — الواجهة
└── server/   # Node/Express + MongoDB — الـ API
```

## التشغيل (أول مرة)

1. جهّز MongoDB — إما محلي، أو حساب مجاني على [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. جهّز إعدادات السيرفر:
   ```
   cp server/.env.example server/.env
   ```
   وافتحه واملأ `MONGO_URI` (لينك الداتابيز) و `JWT_SECRET` (أي نص عشوائي طويل)
3. من مجلد المشروع الرئيسي:
   ```
   npm run install:all
   npm run seed
   npm run dev
   ```
   - السيرفر: http://localhost:5000
   - الواجهة (Angular dev server): http://localhost:4200

## أول استخدام
افتح الواجهة، اعمل "إنشاء حساب" — أول حساب بيتعمل بياخد صلاحية **أدمن** تلقائيًا. أي حد يعمل حساب بعد كده بيبقى **staff** (يقدر يدخل بيانات الأداء الشهرية بس، مش يعدل الإعدادات أو يمسح موظفين).

## الفرونت اند (Angular)
- **Standalone components + Signals** بدل NgModules/RxJS state — أبسط وأقرب لأسلوب المشروع
- `core/auth.service.ts` + `core/payroll.service.ts`: كل الـ state والاتصال بالـ API
- `core/auth.interceptor.ts`: بيحط الـ JWT في كل request أوتوماتيك، وبيعمل logout لو الـ token انتهى
- `core/auth.guard.ts`: بيحمي كل صفحات النظام، بيحول لـ `/login` لو مفيش تسجيل دخول
- `core/calc.ts`: نفس محرك الحساب المتطابق مع نسخة الباك اند
- غيّر رابط الـ API من `client/src/environments/environment.ts` (تطوير) و`environment.prod.ts` (نشر)

## الفصل بين البيانات
- **Master Data** (ثابتة): الستريمرز، الريكروترز، موظفي الإدارة/IT، الإعدادات العامة — دول بيانات بتفضل زي ما هي بين الشهور.
- **Monthly Data** (خاصة بكل "فترة رواتب"): الأداء، سجل الريكروتينج، الـ Tier counts، البونص/الخصم الشهري.
- تقدر تفتح فترة جديدة من الشريط العلوي، وتقفل القديمة فتبقى Read-only للأبد حتى لو غيرت الإعدادات بعدين.

## اللي اتصحح عن الإكسيل الأصلي
- **Bug حقيقي في الإكسيل**: عمولة Tier 2 في شيتات Management/IT كانت بتتجاهل من الموظف التاني فصاعدًا — اتصلح هنا، Tier 2 بيتحسب صح لكل الموظفين.
- **الـ Rate بتاع الستريمرز** بيتعامل معاه كـ نسبة عشرية (0.62) مش رقم صحيح (62)، زي ما هو متخزن فعليًا في الإكسيل الأصلي.
- **4 قواعد كانت غير محسومة** في الإكسيل الأصلي (معامل تحويل EGP، طريقة حساب Tier في الإدارة/IT، هل البونص شهري ولا ثابت، معنى حالة الستريمر) بقت **إعدادات قابلة للتعديل** من صفحة "الإعدادات" بدل ما تتقفل في الكود.

## النشر أونلاين (لما تكون جاهز)
- **السيرفر**: أي منصة بتشغل Node (Render / Railway / VPS عادي) + رابط MongoDB Atlas.
- **الواجهة**: `npm run build:client` بينتج `client/dist/golden-streamers-ng/browser` جاهز لأي static hosting (Vercel/Netlify).
- محتاج بس تغيّر `apiUrl` في `client/src/environments/environment.prod.ts` لرابط السيرفر بعد النشر، و`CLIENT_ORIGIN` في `server/.env` لرابط الواجهة (عشان CORS).

## استيراد أسماء الستريمرز من Excel

من حساب أدمن، اختار فترة مفتوحة ثم صفحة «الستريمرز» ← «رفع Excel للأسماء».
ارفع ملف .xlsx (حتى 5 MB)، اختار الورقة وعمود الاسم وأول صف بيانات، راجع المعاينة واضغط «استيراد الأسماء».
ملف Base (1).xlsx يتم اختيار ورقة Name & Rates تلقائيًا؛ عنوانها في الصف 1 والأسماء تبدأ من الصف 2.
يدعم أسماء عربية، أوراق متعددة، وعناوين أعمدة في صفوف متأخرة، أو ملف بدون عنوان باختيار أول صف بيانات 1.
الاستيراد للأسماء فقط، حتى 10000 اسم في الدفعة. يتجاهل الفراغات والمعادلات ويزيل تكرار الأسماء بعد قص المسافات.
الأسماء الموجودة لا تتغير بياناتها، والجديدة تستخدم defaultRate من الإعدادات. يمكن إعادة رفع نفس الملف بأمان.
عدّل Rate والبونص والخصم وأسبابهما من «الأسماء والنسب»؛ البونص والخصم مرتبطان بالفترة الحالية.
ملفات .xls القديمة تحتاج حفظها بصيغة .xlsx أولًا.

## التحقق من الحسابات

مرجع التنفيذ: Base (1).xlsx، الأعمدة E:T في Streamers، وG/L في Recruiters، وB/H/M في Management وIT.
- النسب الافتراضية: Standard = 3% عند 20 يوم و60 ساعة، وExtra = 2% عند 22 يوم و100 ساعة و150000 Score.
- Score % يشترط الأداء والـ Score معًا؛ مبلغ Score المنفصل يشترط Score فقط، طبقًا لاختلاف معادلتي E وF في الشيت.
- Total Score = Score × (Score % + Days % + Extra %).
- Cash = Total Score ÷ 100 × Rate. الإجمالي = Cash + Bonus − Deduction. EGP = الإجمالي × 50 افتراضيًا.
- العمولات حسب الـ Tier: 0، 1500، 1000، 500، 0 جنيه. أساسي الإدارة وIT = 8000 جنيه.
- استثناء موثّق عن الملف: Tier 2 محسوب لكل موظفي الإدارة وIT؛ الملف يتجاهله بعد الصف الأول. لا توجد مطابقة حرفية لهذا الخطأ.
- عَدّ الموظفين وإجماليات النظام تشمل كل السجلات، بدون حدود صفوف Excel القديمة.

تشغيل الاختبارات: npm test --prefix server
بناء الواجهة: npm run build --prefix client
اختبارات HTTP تستخدم قاعدة بيانات بديلة في الذاكرة ولا تعدّل بيانات التشغيل.

## لوحة التحكم والمصروفات

قسم «نظرة عامة على الرواتب» قابل للفتح والطي، ويعرض الإجمالي عند إغلاقه.
المصروفات متاحة للأدمن أسفل القسم. أضف الشركات من زر «+ شركة»، ثم اختر الشركة وفترة الرواتب وسجّل المبلغ والبيان والتاريخ والإيصال الاختياري.
إجمالي المصروفات يخص الشركة والفترة المختارتين؛ الفترات المقفولة للعرض فقط.

الشركات والمصروفات والإيصالات محفوظة في MongoDB. تُخزن الملفات داخل مستند المصروف كـ Buffer، ولا تحتاج مجلد uploads أو خدمة تخزين إضافية. الحد لكل إيصال 3 MB بصيغ JPG/PNG/PDF. جلب الملف يتم بطلب موثّق بصلاحية الأدمن، وليس برابط عام؛ النسخ الاحتياطي لقاعدة البيانات يشمل الإيصالات.

- `GET/POST /api/companies`: عرض الشركات وإضافتها.
- `GET/POST /api/expenses?companyId=...&periodId=...`: عرض المصروفات والإجمالي أو إضافة مصروف.
- `PATCH/DELETE /api/expenses/:id?companyId=...&periodId=...`: تعديل المصروف أو حذفه مع إيصاله.
- `GET /api/expenses/:id/receipt?companyId=...&periodId=...`: عرض الإيصال المحمي.

اختبارات الواجهة الموجودة في `.verification/expenses-ui.mjs` تستخدم بيانات API وهمية، وليست اختبار حفظ فعلي في MongoDB. السكربت الحالي يحتاج Edge ومسار Playwright المحلي المذكور في بدايته.

## Game Tracker

صفحة /game-tracker بسجلات للإضافة والقراءة فقط، وصلاحيات لـ Saif وثلاثة محاسبين. إعداد الحسابات من متغيرات البيئة موضح في [دليل Game Tracker](server/GAME_TRACKER.md). لا توجد كلمات مرور افتراضية، ولن تتاح الصفحة قبل إعداد الحسابات.
