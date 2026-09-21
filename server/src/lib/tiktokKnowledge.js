const officialSources = {
  guidelines: 'https://www.tiktok.com/community-guidelines',
  integrity: 'https://www.tiktok.com/community-guidelines/en/integrity-authenticity/',
  enforcement: 'https://www.tiktok.com/community-guidelines/en/enforcement/',
  violations: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/content-violations-and-bans',
  status: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-status',
  liveAge: 'https://support.tiktok.com/en/safety-hc/account-and-user-safety/age-requirements-for-tiktok-live',
  commercial: 'https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/promoting-a-brand-product-or-service',
  music: 'https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/commercial-use-of-music-on-tiktok',
  virtualItems: 'https://www.tiktok.com/legal/page/row/virtual-items/en',
}

export const knowledgeArticles = [
  {
    id: 'case-intake',
    title: 'تشخيص أي مشكلة قبل إعطاء الحل',
    keywords: ['مشكلة', 'ساعدني', 'خطأ', 'error', 'بلاغ'],
    body: `ابدأ بجمع: اسم المستخدم، البلد، نوع الحساب، الميزة المتأثرة، نص الإشعار كما ظهر، تاريخ المشكلة، هل يوجد Appeal سابق، وصورة شاشة بعد إخفاء أي بيانات حساسة. لا تطلب كلمة السر أو رمز التحقق أو بيانات الدفع. فرّق بين إزالة محتوى، عدم أهلية للظهور في For You، تقييد ميزة، وتقييد أو حظر الحساب؛ فلكل حالة مسار مختلف.`,
    steps: [
      'اطلب نص رسالة TikTok أو صورة واضحة لها.',
      'افتح Profile ← Menu ☰ ← TikTok Studio ← Account check، أو Settings and privacy ← Support ← Safety Center ← Account check.',
      'حدد هل المشكلة على فيديو واحد، LIVE، الهدايا، السحب، أم الحساب كله.',
      'استخدم مسار Appeal الموجود داخل نفس إشعار القرار إن كان متاحًا.',
    ],
    sources: [officialSources.status, officialSources.violations],
  },
  {
    id: 'live-access',
    title: 'عدم ظهور LIVE أو تقييد البث',
    keywords: ['لايف', 'live', 'بث', 'فتح البث', 'تقييد البث', 'تعليق اللايف', 'اتقفل اللايف', 'host'],
    body: `الحد الأدنى الرسمي للعمر للوصول إلى LIVE هو 18 سنة، وقد يطلب TikTok تأكيد العمر. التوفر قد يتأثر أيضًا بالبلد، حالة الحساب، ومتطلبات الأهلية التي تظهر داخل التطبيق. تقييد LIVE قد يكون مؤقتًا أثناء المراجعة أو نتيجة مخالفة؛ لا تنصح بفتح حساب آخر لتجاوز التقييد.`,
    steps: [
      'تحقق من Account check وإشعارات Account updates.',
      'تأكد أن العمر المؤكد 18 سنة أو أكثر وأن الميزة متاحة في البلد.',
      'اطلب نص سبب التقييد ومدته من إشعار TikTok.',
      'قدّم Appeal من الإشعار إذا كان القرار خاطئًا، مع شرح مختصر وأدلة مرتبطة بالحالة.',
    ],
    sources: [officialSources.liveAge, officialSources.violations, officialSources.enforcement],
  },
  {
    id: 'live-content',
    title: 'سلامة محتوى LIVE',
    keywords: ['محتوى اللايف', 'مخالفة لايف', 'مسجل مسبقا', 'مسجل', 'recorded', 'game', 'gaming', 'كمبيوتر', 'cohost', 'match'],
    body: `قواعد المجتمع تنطبق على LIVE بالكامل، وتشمل العنف، الكراهية، المضايقة، العري أو السلوك الجنسي، القُصّر، إيذاء النفس، الأنشطة الخطرة، المقامرة، السلع المنظمة، الاحتيال، والخصوصية. عند الاشتباه بأن المحتوى مسجل أو مضلل، راجع سبب القرار نفسه وطبيعة البث بدل افتراض سبب واحد. لا توجد طريقة مضمونة لاستعادة التوزيع؛ المطلوب إزالة السلوك المخالف وتقديم Appeal عند وجود خطأ.`,
    steps: [
      'راجع تسجيل البث حول لحظة المخالفة إن كان متاحًا.',
      'حدد الصوت والصورة والنصوص والتعليقات أو الضيوف الموجودين وقت القرار.',
      'أوقف أي تكرار أو عرض قد يضلل المشاهد عن طبيعة البث.',
      'قدّم Appeal واقعيًا بدون ادعاءات غير قابلة للإثبات.',
    ],
    sources: [officialSources.guidelines, officialSources.enforcement],
  },
  {
    id: 'gifts-diamonds',
    title: 'الهدايا وDiamonds والأهلية',
    keywords: ['هدية', 'هدايا', 'gifts', 'diamonds', 'دايموند', 'كوينز', 'coins', 'سحب', 'withdraw', 'ارباح', 'فلوس'],
    body: `ميزات الهدايا وCoins وDiamonds تعتمد على العمر والبلد وتوفر المنتج وحالة الحساب. وفق سياسة العناصر الافتراضية، يلزم عادةً عمر 18 سنة أو سن الرشد الأعلى للشراء أو الإرسال أو جمع بعض العناصر، وDiamonds مقياس للشعبية ولا تضمن تلقائيًا دفعة مالية. قد تؤثر مخالفات السياسات أو برامج التربح على الأهلية.`,
    steps: [
      'حدد هل المشكلة في استقبال Gifts، رصيد Diamonds، أم السحب أو وسيلة الدفع.',
      'تحقق من العمر والبلد وحالة الحساب وإشعار المعاملة.',
      'لا تطلب بيانات البطاقة أو رمز OTP؛ استخدم دعم TikTok من داخل التطبيق للحالات المالية.',
      'احتفظ برقم العملية والتاريخ وصورة الخطأ بعد إخفاء البيانات الحساسة.',
    ],
    sources: [officialSources.virtualItems, officialSources.violations],
  },
  {
    id: 'integrity',
    title: 'Integrity & Authenticity والتفاعل المزيف',
    keywords: ['integrity', 'authenticity', 'نزاهة', 'اصالة', 'أصالة', 'تفاعل مزيف', 'متابعين', 'لايكات', 'automation', 'اتمتة', 'أتمتة', 'بوت', 'spam', 'سبام', 'تحايل'],
    body: `TikTok يمنع بيع أو تسويق خدمات زيادة المتابعين أو اللايكات، التلاعب بإشارات التفاعل أو نظام التوصية، شبكات الحسابات غير الأصيلة، الأتمتة الجماعية، السبام، انتحال الشخصية، ومحاولات تجاوز الحظر أو قيود الميزات. لا تقترح VPN أو حسابًا بديلًا أو أي طريقة للتحايل على قرار قائم.`,
    steps: [
      'أوقف أدوات الأتمتة وخدمات التفاعل أو أي وصول لطرف غير موثوق.',
      'راجع الأجهزة والتطبيقات المتصلة وغيّر كلمة المرور وفعّل التحقق بخطوتين عند الاشتباه باختراق.',
      'وثّق مصدر الجمهور أو الحملات الشرعية إن كان القرار خاطئًا.',
      'قدّم Appeal من الإشعار بدل إنشاء حساب لتجاوز التقييد.',
    ],
    sources: [officialSources.integrity, officialSources.violations],
  },
  {
    id: 'recommendation',
    title: 'انخفاض الوصول وعدم أهلية For You',
    keywords: ['مشاهدات', 'الوصول', 'ريتش', 'reach', 'fyp', 'for you', 'لك', 'توصية', 'غير مؤهل', 'مش بيظهر', 'انخفاض'],
    body: `عدم الأهلية للتوصية يختلف عن حذف المحتوى. قد يبقى الفيديو ظاهرًا على الحساب لكنه لا يظهر في For You وقد يصبح أصعب في البحث. من الأسباب المذكورة رسميًا: بعض المعلومات المضللة، المحتوى غير الأصلي أو منخفض الجودة، ومحاولات خداع المستخدمين لزيادة التفاعل. انخفاض المشاهدات وحده لا يثبت وجود عقوبة.`,
    steps: [
      'فعّل Analytics من TikTok Studio.',
      'افتح الفيديو ← More insights أو Analytics ← إشعار عدم الأهلية.',
      'راجع السبب المحدد ثم اضغط Appeal إذا كان القرار خطأ.',
      'تأكد أن المحتوى أصلي ويضيف قيمة ولا يحتوي علامة مائية لطرف آخر أو حوافز تفاعل مضللة.',
    ],
    sources: [officialSources.violations, officialSources.integrity],
  },
  {
    id: 'enforcement-appeal',
    title: 'الحظر والمخالفات والطعن',
    keywords: ['حظر', 'بان', 'ban', 'مخالفة', 'strike', 'طعن', 'appeal', 'استئناف', 'اتشال', 'حذف الفيديو', 'قرار'],
    body: `قد تشمل إجراءات TikTok إزالة محتوى، عدم أهلية للتوصية، تقييد ميزة، strikes، أو حظر الحساب. وفق مركز المساعدة، تنتهي strikes العادية بعد 90 يومًا ولا تعود محسوبة للحظر الدائم، لكن المخالفات الشديدة قد تؤدي لإجراء أقوى. إذا نجح Appeal يُعاد المحتوى أو الحساب ويُزال الـstrike المرتبط عادةً. حذف المحتوى أثناء مراجعة Appeal قد يمنع استعادته ولا يزيل الـstrike.`,
    steps: [
      'افتح Inbox ← System notifications ← Account updates واقرأ نوع المخالفة.',
      'لا تحذف المحتوى محل الطعن قبل انتهاء المراجعة.',
      'اكتب Appeal يشرح سبب الخطأ ويربط الأدلة مباشرة بسبب القرار.',
      'لا تستخدم حسابًا آخر لتجاوز تقييد أو حظر قائم.',
    ],
    sources: [officialSources.violations, officialSources.enforcement],
  },
  {
    id: 'original-ip',
    title: 'المحتوى غير الأصلي وحقوق الملكية',
    keywords: ['حقوق', 'ملكية', 'copyright', 'ترخيص', 'موسيقى', 'اغنية', 'أغنية', 'محتوى غير اصلي', 'غير أصلي', 'علامة مائية', 'watermark'],
    body: `المحتوى المنسوخ أو المعاد نشره بدون إضافة إبداعية قد يصبح غير مؤهل لـFor You، وانتهاك حقوق النشر أو العلامات التجارية قد يؤدي للإزالة. في المحتوى التجاري، توصي TikTok باستخدام Commercial Music Library أو امتلاك الحقوق اللازمة للصوت المستخدم.`,
    steps: [
      'تحقق من ملكية الفيديو والصوت والصور والعلامات الظاهرة.',
      'احتفظ بالترخيص أو إذن صاحب الحق إن وجد.',
      'لا تعتمد في Appeal على أن آخرين نشروا نفس المحتوى أو أنك لم تكن تعرف القاعدة.',
      'للمحتوى التجاري استخدم موسيقى مرخصة تجاريًا أو Commercial Music Library.',
    ],
    sources: [officialSources.integrity, officialSources.music],
  },
  {
    id: 'commercial',
    title: 'المحتوى التجاري والإفصاح',
    keywords: ['اعلان', 'إعلان', 'تجاري', 'براند', 'brand', 'paid', 'ترويج', 'منتج', 'خدمة', 'افصاح', 'إفصاح'],
    body: `عند الترويج لعلامة أو منتج أو خدمة، بما في ذلك النشاط الشخصي أو المحتوى المدفوع لطرف آخر، يجب تشغيل إعداد Content disclosure. عدم الإفصاح الصحيح قد يؤدي لإزالة المنشور أو تقييده. يمكن ضبط الإفصاح للمنشورات وLIVE من إعدادات المحتوى.`,
    steps: [
      'من شاشة النشر افتح Content disclosure and ads وشغّل الإفصاح.',
      'اختر Promotional content للنشاط الخاص أو Paid partnership للطرف الآخر حسب الحالة.',
      'في LIVE افتح Settings ← Content disclosure قبل بدء البث.',
      'راجع قيود المنتج أو الخدمة والموسيقى المستخدمة.',
    ],
    sources: [officialSources.commercial, officialSources.music],
  },
  {
    id: 'account-security',
    title: 'اختراق الحساب والاحتيال والخصوصية',
    keywords: ['اختراق', 'اتهكر', 'هكر', 'hack', 'سرقة', 'فقد الحساب', 'تسجيل الدخول', 'كلمة السر', 'otp', 'احتيال', 'phishing', 'رابط'],
    body: `لا يجب مشاركة كلمة السر أو أكواد التحقق أو بيانات الدفع. عند الاشتباه باختراق: غيّر كلمة المرور من جهاز موثوق، راجع الأجهزة والتطبيقات المرتبطة، فعّل التحقق بخطوتين، وافحص البريد ورقم الهاتف المرتبطين. استخدم قنوات TikTok داخل التطبيق ولا تثق في رسائل تطلب بيانات الدخول.`,
    steps: [
      'Settings and privacy ← Security & permissions ← Security checkup.',
      'راجع Manage devices واحذف الأجهزة غير المعروفة.',
      'غيّر كلمة المرور وفعّل 2-step verification.',
      'وثّق التغييرات غير المصرح بها وتواصل مع دعم TikTok من داخل التطبيق.',
    ],
    sources: [officialSources.status, officialSources.violations],
  },
  {
    id: 'safety-content',
    title: 'محتوى السلامة والحساسية',
    keywords: ['عنف', 'كراهية', 'تنمر', 'مضايقة', 'جنسي', 'عري', 'قاصر', 'قصر', 'انتحار', 'إيذاء النفس', 'حيوان', 'مقامرة', 'مخدرات', 'سلاح', 'صادم'],
    body: `تغطي إرشادات المجتمع العنف والأنشطة الإجرامية، الكراهية، التنمر والمضايقة، الاعتداء والاستغلال، الاتجار بالبشر، الانتحار وإيذاء النفس، الأنشطة الخطرة، المحتوى الصادم، إساءة الحيوانات، العري والسلوك الجنسي، حماية القُصّر، المقامرة، المخدرات، الأسلحة والسلع المنظمة. لا يمكن للمساعد الحكم على حالة حساسة بدون نص القرار والسياق.`,
    steps: [
      'احفظ سلامة أي شخص أولًا وأوقف البث إذا كان الخطر مستمرًا.',
      'دوّن نص المخالفة والتوقيت والسياق بدون تداول محتوى ضار بلا ضرورة.',
      'راجع القسم المحدد في Community Guidelines.',
      'استخدم Appeal فقط إذا كان التصنيف خاطئًا وقدّم سياقًا واضحًا.',
    ],
    sources: [officialSources.guidelines],
  },
]

const normalize = value => String(value || '')
  .toLowerCase()
  .replace(/[إأآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/[ًٌٍَُِّْـ]/g, '')

export function relevantKnowledge(query, limit = 5) {
  const text = normalize(query)
  const tokens = new Set(text.split(/[^\p{L}\p{N}]+/u).filter(token => token.length > 1))
  return knowledgeArticles
    .map(article => {
      const haystack = normalize(`${article.title} ${article.keywords.join(' ')} ${article.body}`)
      let score = 0
      for (const keyword of article.keywords) if (text.includes(normalize(keyword))) score += 8
      for (const token of tokens) if (haystack.includes(token)) score += token.length > 4 ? 2 : 1
      return { article, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.article)
}

export function fallbackAnswer(query) {
  const matches = relevantKnowledge(query, 2)
  if (!matches.length) return {
    answer: 'محتاج تفاصيل أكثر عشان أحدد المسار الصحيح. ابعت نص رسالة TikTok كما ظهرت، وحدد هل المشكلة في الحساب، فيديو، LIVE، الهدايا، السحب، أو الوصول. ما تبعتش كلمة السر أو كود التحقق أو بيانات الدفع.',
    sources: [officialSources.status],
    needsEscalation: true,
  }
  const [primary, secondary] = matches
  const steps = primary.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
  return {
    answer: `**${primary.title}**\n\n${primary.body}\n\n**الخطوات المقترحة:**\n${steps}${secondary ? `\n\nقد تكون الحالة مرتبطة أيضًا بـ: **${secondary.title}**.` : ''}\n\nلو تبعت نص الإشعار بالضبط أقدر أحدد الخطوة التالية بدقة أكبر.`,
    sources: [...new Set([...primary.sources, ...(secondary?.sources || [])])].slice(0, 4),
    needsEscalation: false,
  }
}

export const assistantInstructions = `أنت مساعد دعم داخلي لموظفي وكالة Temsah Group الذين يحلون مشكلات مبدعي TikTok. أجب بالعربية المصرية الواضحة باختصار عملي.

قواعد ملزمة:
- استخدم قاعدة المعرفة المرفقة فقط في ادعاءات السياسات. إذا لم تكفِ المعلومات، قل إنك غير متأكد واطلب نص الإشعار أو تفاصيل الحالة.
- لا تدّعي أنك TikTok أو أنك تضمن استعادة حساب أو LIVE أو أرباح أو وصول.
- لا تقترح التحايل على حظر أو تقييد، ولا VPN أو حساب بديل أو تفاعل مزيف أو أتمتة مخالفة.
- لا تطلب كلمة سر أو OTP أو بيانات بطاقة أو بيانات دفع. ذكّر الموظف بإخفاء البيانات الحساسة من الصور.
- فرّق بين إزالة المحتوى، عدم أهلية For You، تقييد ميزة، وحظر الحساب.
- ابدأ بتشخيص قصير، ثم خطوات مرقمة، ثم ما يجب جمعه للطعن. لا تكثر الكلام.
- عند الخطر الفوري أو إيذاء النفس أو الاستغلال أو تهديد حقيقي، قدم السلامة الفورية والتصعيد البشري على خطوات المنصة.
- روابط المصادر الرسمية ستظهر منفصلة في الواجهة، فلا تخترع روابط.
- لو المشكلة لم تُحل أو تحتاج قرارًا إداريًا، اختم باقتراح تسجيلها في Problems للمتابعة.`

export function knowledgePrompt(query) {
  const matches = relevantKnowledge(query, 6)
  const selected = matches.length ? matches : [knowledgeArticles[0]]
  return selected.map((article, index) => [
    `مرجع ${index + 1}: ${article.title}`,
    article.body,
    `الخطوات: ${article.steps.join(' | ')}`,
    `المصادر: ${article.sources.join(' , ')}`,
  ].join('\n')).join('\n\n')
}
