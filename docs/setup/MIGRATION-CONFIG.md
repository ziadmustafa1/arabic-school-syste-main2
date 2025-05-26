# تكوين ملف البيئة للترحيل

لتنفيذ سكريبت الترحيل، يجب عليك إنشاء ملف `.env` في المجلد الرئيسي للمشروع بالمتغيرات التالية:

```
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# For migration script
SUPABASE_URL=your-supabase-database-connection-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

## خطوات الحصول على متغيرات البيئة من Supabase

1. **NEXT_PUBLIC_SUPABASE_URL** و **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - قم بتسجيل الدخول إلى لوحة تحكم Supabase
   - انتقل إلى مشروعك
   - اضغط على أيقونة "الإعدادات" (⚙️) في القائمة الجانبية
   - انتقل إلى "API"
   - ستجد `URL` و `anon` `public` تحت "Project URL" و "Project API keys"

2. **SUPABASE_URL**:
   - انتقل إلى "الإعدادات" > "قاعدة البيانات"
   - ابحث عن "Connection string" واختر "URI"
   - انسخ سلسلة الاتصال التي تبدأ بـ `postgres://`

3. **SUPABASE_SERVICE_KEY**:
   - انتقل إلى "الإعدادات" > "API"
   - ابحث عن "service_role" تحت "Project API keys"
   - انسخ المفتاح (ملاحظة: احتفظ بهذا المفتاح آمنًا لأنه يمنح وصولاً كاملاً لقاعدة البيانات)

## تنفيذ الترحيل

بعد تكوين المتغيرات البيئية، قم بتنفيذ الأمر التالي:

```bash
npm run migrate
```

سيقوم هذا بتنفيذ جميع ملفات SQL الموجودة في مجلد `supabase/migrations`. 