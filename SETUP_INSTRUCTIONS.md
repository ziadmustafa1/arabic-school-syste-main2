# نظام إدارة المدرسة العربية - تعليمات الإعداد

## استكمال إعداد النظام

### إنشاء جداول الحضور في قاعدة البيانات

يجب تنفيذ هذه الخطوات لإنشاء جداول الحضور المطلوبة في قاعدة البيانات:

1. تأكد من وجود المتغيرات البيئية التالية في ملف `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xceeiogswmfqawlwsaez.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   ```

2. قم بتنفيذ أحد الأوامر التالية لإنشاء جداول الحضور:

   **الخيار 1: باستخدام ترحيل Supabase (موصى به)**
   ```
   node scripts/apply-db-migrations.js
   ```

   **الخيار 2: تنفيذ مباشر للمقاطع البرمجية**
   ```
   node scripts/run-attendance-tables.js
   ```

   **الخيار 3: إضافة المقاطع البرمجية يدويًا**
   1. افتح لوحة تحكم Supabase
   2. انتقل إلى محرر SQL
   3. انسخ محتوى الملف `scripts/create-attendance-tables.sql` والصقه في المحرر
   4. قم بتنفيذ الاستعلام

### إصلاح أخطاء في Supabase العميل

هناك أخطاء متعددة في استخدام ملفات تعريف الارتباط (cookies) مع Supabase في Next.js:

```
Error: Route "/student/attendance" used cookies().get('sb-xceeiogswmfqawlwsaez-auth-token'). cookies() should be awaited before using its value.
```

#### الحل 1: تحديث Next.js (موصى به)

قم بتحديث مشروعك إلى Next.js 14 أو أحدث:

```
npm install next@latest
```

#### الحل 2: تحديث Supabase client لاستخدام نمط متزامن

1. فتح ملف `lib/supabase/server.ts`
2. التأكد من أن تعريف العميل يستخدم الوظائف المتزامنة:

```typescript
export function createClient() {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          cookieStore.set(name, value, options)
        },
        remove(name, options) {
          cookieStore.set(name, "", { ...options, maxAge: 0 })
        }
      }
    }
  )
}
```

3. التأكد من استدعاء `cookies()` بشكل متزامن في جميع الصفحات التي تستخدم `createClient()`.

## ملاحظات إضافية

1. **تحسينات الأمان**: 
   - تم إضافة سياسات أمان (RLS) لجميع جداول الحضور
   - يتم التحقق من صلاحيات المستخدم قبل السماح بتعديل البيانات

2. **العلاقات بين الجداول**:
   - تم إنشاء جداول العلاقات (`class_teacher` و `class_student`) للربط بين الصفوف والمستخدمين
   - تم إضافة قيود المفاتيح الأجنبية (Foreign Keys) لضمان تكامل البيانات

3. **تم إزالة الميزات التجريبية**:
   - تم إزالة صفحات وملفات بطاقات الاختبار:
     - `scripts/insert-test-cards.sql`
     - `add-test-cards.js`
     - `app/admin/cards/test-cards/page.tsx`

4. **أنواع البيانات**:
   - تم تحديث ملف `lib/supabase/database.types.ts` ليتضمن تعريفات الجداول الجديدة
   - تأكد من تحديث هذا الملف عند إجراء تغييرات على هيكل قاعدة البيانات

## استكشاف الأخطاء وإصلاحها

إذا استمرت المشاكل بعد تنفيذ الخطوات أعلاه، تحقق من التالي:

1. **خطأ "relation does not exist"**:
   - تأكد من تنفيذ مقاطع SQL لإنشاء الجداول بنجاح
   - تحقق من وجود الجداول في لوحة تحكم Supabase

2. **أخطاء الاستعلام**:
   - تأكد من استخدام أسماء الأعمدة والجداول الصحيحة في الاستعلامات
   - تحقق من امتيازات الوصول للمستخدم

3. **مشاكل التوثيق**:
   - تأكد من تسجيل الدخول قبل محاولة الوصول إلى الصفحات المحمية
   - تحقق من صلاحية رمز التوثيق في ملفات تعريف الارتباط

4. **حماية ملفات تعريف الارتباط**:
   - إذا كنت تستخدم مسار URI مخصص، تأكد من تكوين `cookieOptions.path` بشكل صحيح

للحصول على مساعدة إضافية، راجع وثائق Next.js و Supabase، أو اتصل بفريق الدعم. 