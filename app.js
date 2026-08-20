/**
 * گندم‌یار (WheatFertile Pro) - Logic & Application Architecture
 * Comprehensive Technical Application Engine based on Soil and Water Research Institute Guideline
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Global Application State
const AppState = {
  theme: localStorage.getItem('wheat_theme') || 'light',
  currentView: 'dashboard',
  selectedOrgan: 'all',
  currentPrescription: null
};

/* ==========================================================================
   Reference Data Models (From the 81-page technical document)
   ========================================================================== */

// Tables 8, 9, 10: Urea recommendation by Soil Organic Carbon (%) and Yield
const UreaTables = {
  // OC < 0.5% (Table 8)
  lowOC: {
    'warm-humid': { 3: 240, 4: 290, 5: 340, 6: 380, 7: 420 },
    'warm-dry':   { 3: 260, 4: 310, 5: 360, 6: 400, 7: 430 },
    'temperate':  { 3: 240, 4: 290, 5: 340, 6: 380, 7: 420 },
    'cold':       { 3: 210, 4: 260, 5: 310, 6: 350, 7: 390 }
  },
  // 0.5% <= OC <= 0.75% (Table 9)
  midOC: {
    'warm-humid': { 3: 210, 4: 260, 5: 310, 6: 350, 7: 390 },
    'warm-dry':   { 3: 230, 4: 280, 5: 330, 6: 370, 7: 400 },
    'temperate':  { 3: 210, 4: 260, 5: 310, 6: 350, 7: 390 },
    'cold':       { 3: 180, 4: 230, 5: 280, 6: 320, 7: 360 }
  },
  // 0.75% <= OC <= 1.0% (Table 10)
  highOC: {
    'warm-humid': { 3: 180, 4: 230, 5: 280, 6: 320, 7: 360 },
    'warm-dry':   { 3: 200, 4: 250, 5: 300, 6: 340, 7: 370 },
    'temperate':  { 3: 180, 4: 230, 5: 280, 6: 320, 7: 360 },
    'cold':       { 3: 150, 4: 200, 5: 250, 6: 290, 7: 330 }
  },
  // General without soil test (Table 11)
  general: {
    'warm-humid': { 3: 220, 4: 270, 5: 320, 6: 360, 7: 400 },
    'warm-dry':   { 3: 240, 4: 290, 5: 340, 6: 380, 7: 410 },
    'temperate':  { 3: 220, 4: 270, 5: 320, 6: 360, 7: 400 },
    'cold':       { 3: 190, 4: 240, 5: 290, 6: 330, 7: 370 }
  },
  // Rainfed wheat based on rainfall (mm) (Table 12)
  rainfed: [
    { minRain: 250, maxRain: 275, nKg: 40, ureaKg: 87 },
    { minRain: 275, maxRain: 300, nKg: 45, ureaKg: 98 },
    { minRain: 300, maxRain: 325, nKg: 50, ureaKg: 109 },
    { minRain: 325, maxRain: 350, nKg: 55, ureaKg: 120 },
    { minRain: 350, maxRain: 375, nKg: 60, ureaKg: 130 },
    { minRain: 375, maxRain: 400, nKg: 65, ureaKg: 141 },
    { minRain: 400, maxRain: 9999, nKg: 70, ureaKg: 152 }
  ]
};

// Tables 14-17: Phosphorus (TSP/DAP) by Soil P (mg/kg) & Yield
const PhosphorusTables = {
  // P < 5 mg/kg (Table 14)
  pLess5: {
    'warm-humid': { 3: 200, 4: 230, 5: 260, 6: 290, 7: 310 },
    'warm-dry':   { 3: 185, 4: 215, 5: 245, 6: 275, 7: 295 },
    'temperate':  { 3: 200, 4: 230, 5: 260, 6: 290, 7: 310 },
    'cold':       { 3: 220, 4: 250, 5: 280, 6: 310, 7: 330 }
  },
  // 5 <= P < 10 mg/kg (Table 15)
  p5to10: {
    'warm-humid': { 3: 160, 4: 190, 5: 220, 6: 250, 7: 270 },
    'warm-dry':   { 3: 145, 4: 175, 5: 205, 6: 235, 7: 255 },
    'temperate':  { 3: 160, 4: 190, 5: 220, 6: 250, 7: 270 },
    'cold':       { 3: 180, 4: 210, 5: 240, 6: 270, 7: 290 }
  },
  // 10 <= P < 12 mg/kg (Table 16)
  p10to12: {
    'warm-humid': { 3: 70, 4: 100, 5: 130, 6: 160, 7: 180 },
    'warm-dry':   { 3: 55, 4: 85,  5: 115, 6: 145, 7: 165 },
    'temperate':  { 3: 70, 4: 100, 5: 130, 6: 160, 7: 180 },
    'cold':       { 3: 90, 4: 120, 5: 150, 6: 180, 7: 200 }
  },
  // 12 <= P < 15 mg/kg (Table 17)
  p12to15: {
    'warm-humid': { 3: 20, 4: 50, 5: 80,  6: 110, 7: 130 },
    'warm-dry':   { 3: 20, 4: 40, 5: 70,  6: 100, 7: 120 },
    'temperate':  { 3: 20, 4: 50, 5: 80,  6: 110, 7: 130 },
    'cold':       { 3: 40, 4: 70, 5: 100, 6: 130, 7: 160 }
  },
  // Rainfed P (Table 18)
  rainfed: {
    9: { p2o5: 7,  fert: 15 },
    8: { p2o5: 14, fert: 30 },
    7: { p2o5: 21, fert: 45 },
    6: { p2o5: 28, fert: 60 },
    5: { p2o5: 35, fert: 75 },
    4: { p2o5: 42, fert: 90 }
  }
};

// Tables 20-22: Potassium Sulfate (SOP) by Soil K (mg/kg) & Yield
const PotassiumTables = {
  // 0 <= K < 100 mg/kg (Table 20)
  k0to100: {
    'warm-humid': { 3: 220, 4: 240, 5: 260, 6: 280, 7: 300 },
    'warm-dry':   { 3: 210, 4: 230, 5: 250, 6: 270, 7: 290 },
    'temperate':  { 3: 220, 4: 240, 5: 260, 6: 280, 7: 300 },
    'cold':       { 3: 230, 4: 250, 5: 270, 6: 290, 7: 310 }
  },
  // 100 <= K < 150 mg/kg (Table 21)
  k100to150: {
    'warm-humid': { 3: 150, 4: 170, 5: 190, 6: 210, 7: 230 },
    'warm-dry':   { 3: 140, 4: 160, 5: 180, 6: 190, 7: 220 },
    'temperate':  { 3: 150, 4: 170, 5: 190, 6: 210, 7: 230 },
    'cold':       { 3: 160, 4: 180, 5: 200, 6: 220, 7: 240 }
  },
  // 150 <= K < 200 mg/kg (Table 22)
  k150to200: {
    'warm-humid': { 3: 50, 4: 70, 5: 90,  6: 110, 7: 120 },
    'warm-dry':   { 3: 40, 4: 60, 5: 80,  6: 100, 7: 110 },
    'temperate':  { 3: 50, 4: 70, 5: 90,  6: 110, 7: 120 },
    'cold':       { 3: 60, 4: 80, 5: 100, 6: 120, 7: 140 }
  }
};

// Table 25: Salinity & Leaching Water Requirement
const SalinityTable = [
  { maxEC: 6.0,  leaching: 'بدون نیاز به آبشویی', volumeM3: 0, desc: 'شوری زیر حد آستانه گندم است.' },
  { maxEC: 7.5,  leaching: 'آبیاری اول سنگین', volumeM3: 1000, desc: 'آبیاری اول سنگین به میزان ۱۰۰۰ مترمکعب در هکتار جهت آبشویی نمک از بستر بذر.' },
  { maxEC: 9.5,  leaching: 'آبیاری اول و دوم سنگین', volumeM3: 2000, desc: 'آبیاری اول و دوم سنگین (هر نوبت ۱۰۰۰ مترمکعب) انجام شود.' },
  { maxEC: 13.0, leaching: 'یک نوبت قبل از کاشت + آبیاری اول و دوم سنگین', volumeM3: 3000, desc: 'شستشوی پروفیل قبل از بذرکاری الزامی است.' },
  { maxEC: 20.0, leaching: 'آبشویی بسیار سنگین قبل از کاشت + آبیاری اول و دوم سنگین', volumeM3: 4000, desc: 'خاک بسیار شور؛ لزوم استفاده از ارقام متحمل و کاشت روی پشته/فارو.' },
  { maxEC: 999,  leaching: 'مشاوره اختصاصی با کارشناس', volumeM3: 5000, desc: 'شوری بحرانی؛ نیاز به آزمایش آب و طراحی سیستم زهکشی زیرزمینی.' }
];

// Visual Deficiency Diagnostic Database
const DeficiencyDB = [
  {
    id: 'n-def',
    element: 'نیتروژن',
    symbol: 'N',
    type: 'macro',
    organ: 'old-leaves',
    organFa: 'برگ‌های پیر (پایینی)',
    summary: 'رنگ‌پریدگی عمومی، کلروز یکنواخت از برگ‌های مسن به جوان، ساقه‌های باریک و کاهش شدید پنجه‌دهی',
    details: 'کمبود نیتروژن معمول‌ترین کمبود در غلات است. کلروز از نوک و قاعده برگ‌های مسن آغاز شده و به تدریج تمام پهنک را زرد می‌کند در حالی که برگ‌های جوان سبز کم‌رنگ باقی می‌مانند. در مزرعه قطعات زرد/سبز روشن دیده می‌شود.',
    optimalContent: '۴ تا ۵ درصد در پنجه‌زنی | ۲.۵ تا ۳ درصد در ظهور برگ پرچم',
    soilCritical: 'وابسته به کربن آلی خاک (< ۱٪ نیازمند کوددهی کامل)',
    remedy: 'مصرف سرک کود اوره، سولفات آمونیوم، یا محلول‌پاشی اوره (۴ تا ۸ کیلوگرم در هکتار با غلظت حداکثر ۷ در هزار) همزمان با مبارزه با سن گندم.',
    photoNote: 'کلروز یکنواخت برگ‌های تحتانی و باریک شدن ساقه‌ها'
  },
  {
    id: 'p-def',
    element: 'فسفر',
    symbol: 'P',
    type: 'macro',
    organ: 'old-leaves',
    organFa: 'برگ‌های پیر و ساقه',
    summary: 'رنگ سبز تیره تا ارغوانی/قرمز در نوک و حاشیه برگ‌های پیر، کاهش شدید پنجه‌زنی و تأخیر در رسیدگی دانه',
    details: 'مشخص‌ترین نشانه در مراحل اولیه، توقف رشد پنجه‌هاست. برگ‌ها سبز تیره شده و لبه‌های آن‌ها به رنگ ارغوانی مایل به قرمز تغییر می‌یابد. برگ‌های پیر به دور برگ‌های جوان‌تر پیچ می‌خورند و خوشه‌ها کوچک و نامنظم می‌شوند.',
    optimalContent: '۰.۴ تا ۰.۷ درصد در پنجه‌زنی | ۰.۲ تا ۰.۳ درصد در برگ پرچم',
    soilCritical: '۱۵ میلی‌گرم در کیلوگرم (آبی) | ۹ میلی‌گرم در کیلوگرم (دیم)',
    remedy: 'کاربرد سوپرفسفات تریپل (TSP) یا دی‌آمونیوم فسفات (DAP) به صورت نواری زیر بذر در زمان کاشت؛ کودآبیاری یا محلول‌پاشی در پنجه‌زنی و ساقه‌دهی (۲.۵ تا ۵ کیلوگرم در هکتار).',
    photoNote: 'ارغوانی شدن حاشیه و نوک برگ و کوتولگی بوته'
  },
  {
    id: 'k-def',
    element: 'پتاسیم',
    symbol: 'K',
    type: 'macro',
    organ: 'old-leaves',
    organFa: 'برگ‌های پیر (حاشیه و نوک)',
    summary: 'سوختگی، زردی و نکروز حاشیه و نوک برگ‌های پیر با باقی ماندن پیکان سبزرنگ در مرکز برگ',
    details: 'نکروز حاشیه برگ‌های مسن که شبیه تنش تشنگی است. با گسترش نکروز، بافتی به شکل پیکان سبز در مرکز برگ باقی می‌ماند. کمبود پتاسیم مقاومت گیاه به سرما، خشکی، خوابیدگی (ورس) و بیماری‌ها را به شدت کم می‌کند.',
    optimalContent: '۳.۲ تا ۴ درصد در پنجه‌زنی | ۲ تا ۳ درصد در برگ پرچم',
    soilCritical: '۲۰۰ میلی‌گرم در کیلوگرم خاک',
    remedy: 'مصرف سولفات پتاسیم قبل از کاشت، کودآبیاری (۱۰ تا ۲۰ کیلوگرم در هکتار) در ساقه رفتن و محلول‌پاشی در گلدهی و شیری شدن دانه (۲ تا ۳ کیلوگرم در هکتار).',
    photoNote: 'حاشیه نکروزه و سوخته برگ‌های پیر به فرم پیکان'
  },
  {
    id: 's-def',
    element: 'گوگرد',
    symbol: 'S',
    type: 'macro',
    organ: 'young-leaves',
    organFa: 'برگ‌های جوان (بالایی)',
    summary: 'کلروز و زردی عمومی شبیه نیتروژن اما برخلاف آن ابتدا در برگ‌های جوان ظاهر می‌شود',
    details: 'چون گوگرد در تشکیل کلروفیل نقش دارد علائم شبیه اوره است ولی چون گوگرد در گیاه تحرک کمی دارد، زردی از جوان‌ترین برگ‌ها آغاز می‌شود. در کمبود شدید سنبله‌ها تشکیل نمی‌شوند.',
    optimalContent: '۰.۲۲ تا ۰.۵۵ درصد در پنجه‌زنی | نسبت N/S در بافت کمتر از ۱۳.۷',
    soilCritical: '۱۲ میلی‌گرم در کیلوگرم خاک',
    remedy: 'کاربرد ۵۰۰ تا ۱۰۰۰ کیلوگرم در هکتار گوگرد پاستیل بنتونیت‌دار همراه با باکتری تیوباسیلوس (۱ کیلو به ازای ۵۰ کیلو گوگرد) ۲ تا ۴ ماه قبل از کشت یا مصرف سولفات آمونیوم/پتاسیم.',
    photoNote: 'زردی یکدست در برگ‌های جوان و عدم تشکیل خوشه'
  },
  {
    id: 'mg-def',
    element: 'منیزیم',
    symbol: 'Mg',
    type: 'macro',
    organ: 'leaves',
    organFa: 'برگ‌ها (بین رگبرگ‌ها)',
    summary: 'لکه‌های رنگ‌پریده شبیه دانه‌های تسبیح بین رگبرگ‌ها و لکه‌های نکروزه در نوک برگ',
    details: 'برگ‌های جوان نسبت به برگ‌های پیر روشن‌تر می‌شوند. لکه‌های کلروتیک تسبیحی بین رگبرگ‌های اصلی دیده شده و برگ‌ها کوچک و زرد باقی می‌مانند. بیشتر در خاک‌های سبک و شنی دیده می‌شود.',
    optimalContent: '۰.۱۵ تا ۰.۵ درصد در کل اندام هوایی | ۰.۲ تا ۰.۶ درصد در برگ پرچم',
    soilCritical: 'معمولاً در خاک‌های آهکی به دلیل رقابت کلسیم و پتاسیم بروز می‌کند',
    remedy: 'محلول‌پاشی یا کودآبیاری سولفات منیزیم (MgSO4).',
    photoNote: 'کلروز بین رگبرگی دانه‌تسبیحی'
  },
  {
    id: 'zn-def',
    element: 'روی',
    symbol: 'Zn',
    type: 'micro',
    organ: 'mid-leaves',
    organFa: 'برگ‌های میانی و نوظهور',
    summary: 'تغییر رنگ به سبز برنزی کدر، لکه‌های سوختگی در وسط پهنک، چین‌خوردگی برگ و کوتولگی شدید',
    details: 'شایع‌ترین کمبود ریزمغذی در خاک‌های آهکی ایران (۴۰٪ اراضی). لکه‌های سوخته و نکروزه از مرکز پهنک برگ‌های میانی شروع شده و به حاشیه گسترش می‌یابد. بوته‌ها کوتاه، بوته متراکم و چین‌خورده می‌شود.',
    optimalContent: '۱۸ تا ۷۰ میلی‌گرم در کیلوگرم وزن خشک',
    soilCritical: '۰.۷۵ تا ۱.۰ میلی‌گرم در کیلوگرم (DTPA)',
    remedy: 'مصرف خاکی سولفات روی (۲۵ تا ۴۰ کیلوگرم در هکتار قبل کاشت) + محلول‌پاشی سولفات روی یا کلات روی با غلظت ۳ تا ۵ در هزار در پنجه‌زنی و ساقه‌دهی.',
    photoNote: 'سبز برنزی و لکه‌های سوختگی چین‌خورده در مرکز برگ'
  },
  {
    id: 'fe-def',
    element: 'آهن',
    symbol: 'Fe',
    type: 'micro',
    organ: 'young-leaves',
    organFa: 'برگ‌های جوان',
    summary: 'کلروز نواری رگبرگی (نوارهای متناوب زرد و سبز منظم)، سفید شدن برگ‌های جوان، بوته کاملاً راست و ایستاده',
    details: 'در خاک‌های آهکی با pH بالا ۳۷٪ مزارع دچار کمبودند. تفاوت بین سبزی برگ پیر و زردی برگ جوان بسیار چشمگیر است. بوته بر خلاف منگنز کاملاً شق و ایستاده باقی می‌ماند.',
    optimalContent: '۳۰ تا ۲۰۰ میلی‌گرم در کیلوگرم',
    soilCritical: '۵ تا ۷.۵ میلی‌گرم در کیلوگرم',
    remedy: 'مصرف خاکی کلات آهن Fe-EDDHA (۲ تا ۳ کیلوگرم در هکتار) یا محلول‌پاشی سولفات آهن/کلات آهن (۳ تا ۴ در هزار) همراه با ماده مویان (سیتووت).',
    photoNote: 'نوارهای زرد و سبز کاملاً منظم در طول برگ جوان'
  },
  {
    id: 'mn-def',
    element: 'منگنز',
    symbol: 'Mn',
    type: 'micro',
    organ: 'young-leaves',
    organFa: 'برگ‌های جوان و پهنک',
    summary: 'برگ‌های زرد، پژمرده و افتاده با نوارهای برنزی کم‌رنگ در قاعده برگ',
    details: 'برخلاف آهن که بوته‌ها ایستاده‌اند، در کمبود منگنز برگ‌ها حالت آویزان، تاخورده و پژمرده دارند. لکه‌ها و خطوط برنزی کم‌رنگ از قاعده جوان‌ترین برگ باز شده گسترش می‌یابد.',
    optimalContent: '۲۵ تا ۱۵۰ میلی‌گرم در کیلوگرم',
    soilCritical: '۶ تا ۱۰ میلی‌گرم در کیلوگرم',
    remedy: 'مصرف خاکی سولفات منگنز (۲۰ تا ۳۰ کیلوگرم در هکتار) یا محلول‌پاشی سولفات منگنز ۳ تا ۴ در هزار.',
    photoNote: 'افتادگی بوته و لکه‌های برنزی کم‌رنگ در برگ جوان'
  },
  {
    id: 'cu-def',
    element: 'مس',
    symbol: 'Cu',
    type: 'micro',
    organ: 'young-leaves',
    organFa: 'نوک برگ‌های جوان و پرچم‌ها',
    summary: 'پژمردگی در اوایل پنجه‌دهی، پیچ‌خوردگی و سوختگی ناگهانی نوک برگ، عقیمی پرچم‌ها و سفید شدن خوشه',
    details: 'حتی با وجود رطوبت کافی خاک، گیاه ظاهر پژمرده به خود می‌گیرد. نوک برگ‌های جوان ناگهان سفید، خشک و فنری/پیچ‌خورده می‌شود. در گلدهی دانه‌ها تشکیل نشده و خوشه پوک می‌شود.',
    optimalContent: '۵ تا ۲۰ میلی‌گرم در کیلوگرم',
    soilCritical: '۰.۲۵ تا ۰.۵ میلی‌گرم در کیلوگرم',
    remedy: 'مصرف سولفات مس خاکی یا محلول‌پاشی کلات مس و سولفات مس در پنجه‌زنی.',
    photoNote: 'پیچ‌خوردگی نوک برگ به شکل فنر و سفید شدن سر برگ'
  },
  {
    id: 'b-def',
    element: 'بور',
    symbol: 'B',
    type: 'micro',
    organ: 'spikes',
    organFa: 'سنبله، گل و حاشیه برگ',
    summary: 'ترک‌خوردگی برگ نزدیک رگبرگ اصلی، دندانه‌دار شدن حاشیه، عقیمی کامل سنبله و چروکیدگی شدید دانه‌ها',
    details: 'بور در لقاح و انتقال قندها نقش حیاتی دارد. در کمبود آن تخمدان رشد نکرده، پرچم‌ها بازمانده و سنبله‌ها بدون دانه و عقیم می‌شوند. وزن هزار دانه به شدت افت می‌کند.',
    optimalContent: '۳ تا ۲۰ میلی‌گرم در کیلوگرم',
    soilCritical: '۰.۵ تا ۱ میلی‌گرم در کیلوگرم (در خاک‌های شور مصرف نشود)',
    remedy: 'محلول‌پاشی اسید بوریک قبل از سنبله‌دهی (در خاک‌های غیرشور). در خاک‌های شور به علت احتمال سمیت توصیه نمی‌شود.',
    photoNote: 'ترک‌خوردگی حاشیه برگ و عقیمی سنبله'
  }
];

// Conversion Coefficients (Appendix Table 2)
const ConversionFactors = [
  { from: 'N', to: 'CO(NH2)2 (اوره)', factor: 2.160, formula: 'Urea = N × 2.160' },
  { from: 'N', to: '(NH4)2SO4 (سولفات آمونیوم)', factor: 4.716, formula: 'AS = N × 4.716' },
  { from: 'N', to: 'NH4NO3 (نیترات آمونیوم)', factor: 2.857, formula: 'AN = N × 2.857' },
  { from: 'P', to: 'P2O5 (پنتااکسید فسفر)', factor: 2.291, formula: 'P2O5 = P × 2.291' },
  { from: 'P2O5', to: 'P (فسفر خالص)', factor: 0.436, formula: 'P = P2O5 × 0.436' },
  { from: 'K', to: 'K2O (اکسید پتاسیم)', factor: 1.205, formula: 'K2O = K × 1.205' },
  { from: 'K2O', to: 'K (پتاسیم خالص)', factor: 0.830, formula: 'K = K2O × 0.830' },
  { from: 'K2O', to: 'KCl (کلرید پتاسیم)', factor: 1.580, formula: 'KCl = K2O × 1.580' },
  { from: 'Zn', to: 'ZnSO4 . H2O (سولفات روی مونو)', factor: 2.778, formula: 'ZnSO4.H2O = Zn × 2.778' },
  { from: 'Zn', to: 'ZnSO4 . 7H2O (سولفات روی ۷آبه)', factor: 4.348, formula: 'ZnSO4.7H2O = Zn × 4.348' },
  { from: 'Fe', to: 'FeSO4 (سولفات آهن)', factor: 2.720, formula: 'FeSO4 = Fe × 2.720' },
  { from: 'Mn', to: 'MnSO4 (سولفات منگنز)', factor: 2.748, formula: 'MnSO4 = Mn × 2.748' },
  { from: 'S', to: 'SO4 (سولفات)', factor: 2.996, formula: 'SO4 = S × 2.996' },
  { from: 'Ca', to: 'CaO (اکسید کلسیم)', factor: 1.399, formula: 'CaO = Ca × 1.399' },
  { from: 'Mg', to: 'MgO (اکسید منیزیم)', factor: 1.658, formula: 'MgO = Mg × 1.658' }
];

/* ==========================================================================
   Initialization & Event Binding
   ========================================================================== */
function initApp() {
  applyTheme(AppState.theme);
  setupNavigation();
  setupThemeToggle();
  setupSearch();
  setupModals();
  
  // Render Dynamic Components
  renderDeficiencyClinic('all');
  renderConversionTable();
  renderGrowthStageCharts();
  
  // Bind Calculator Triggers
  bindUreaCalc();
  bindPhosphorusCalc();
  bindPotassiumCalc();
  bindSalinityCalc();
  bindResidueCalc();
  bindConverterTool();
  bindPrescriptionForm();
}

/* ==========================================================================
   Theme & Navigation
   ========================================================================== */
function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener('click', () => {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    applyTheme(AppState.theme);
    localStorage.setItem('wheat_theme', AppState.theme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('#themeToggleBtn span');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, [data-nav-target]');
  const menuBtn = document.getElementById('menuToggleBtn');
  const sidebar = document.getElementById('appSidebar');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetView = item.getAttribute('data-view') || item.getAttribute('data-nav-target');
      if (targetView) {
        navigateTo(targetView);
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      }
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Subtabs switching
  document.querySelectorAll('.subtabs-container').forEach(container => {
    const tabs = container.querySelectorAll('.subtab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const parent = container.parentElement;
        parent.querySelectorAll('.tab-pane').forEach(pane => {
          if (pane.id === targetTab) {
            pane.classList.add('active');
          } else {
            pane.classList.remove('active');
          }
        });
      });
    });
  });
}

function navigateTo(viewId) {
  AppState.currentView = viewId;
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });
  
  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/* ==========================================================================
   1. Urea & Nitrogen Calculator Engine
   ========================================================================== */
function bindUreaCalc() {
  const calcBtn = document.getElementById('btnCalculateUrea');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const cultivationType = document.getElementById('ureaCultivationType').value;
    const climate = document.getElementById('ureaClimate').value;
    const soilOC = parseFloat(document.getElementById('ureaSoilOC').value);
    const yieldTarget = parseInt(document.getElementById('ureaYield').value);
    const soilTexture = document.getElementById('ureaTexture').value;
    const hasPreviousLegume = document.getElementById('ureaLegumeRotation').checked;

    let ureaPerHa = 0;
    let nKgPerHa = 0;
    let tableRef = '';
    let notes = [];

    if (cultivationType === 'rainfed') {
      const rainfall = parseInt(document.getElementById('ureaRainfall').value) || 300;
      let matchedTier = UreaTables.rainfed.find(t => rainfall >= t.minRain && rainfall < t.maxRain) || UreaTables.rainfed[UreaTables.rainfed.length - 1];
      ureaPerHa = matchedTier.ureaKg;
      nKgPerHa = matchedTier.nKg;
      tableRef = 'جدول ۱۲ (توصیه گندم دیم بر اساس بارش)';
      
      if (hasPreviousLegume) {
        ureaPerHa = Math.max(20, ureaPerHa - 30);
        nKgPerHa = Math.max(10, nKgPerHa - 15);
        notes.push('به دلیل تناوب با لگوم/کود سبز، مصرف اوره ۳۰ کیلوگرم در هکتار کاهش یافت.');
      }
    } else {
      // Irrigated
      if (isNaN(soilOC)) {
        // Table 11 (General)
        ureaPerHa = UreaTables.general[climate][yieldTarget] || 320;
        tableRef = 'جدول ۱۱ (توصیه عمومی گندم آبی بدون آزمون خاک)';
      } else if (soilOC < 0.5) {
        ureaPerHa = UreaTables.lowOC[climate][yieldTarget] || 340;
        tableRef = 'جدول ۸ (خاک با کربن آلی کمتر از ۰.۵ درصد)';
      } else if (soilOC <= 0.75) {
        ureaPerHa = UreaTables.midOC[climate][yieldTarget] || 310;
        tableRef = 'جدول ۹ (خاک با کربن آلی ۰.۵ تا ۰.۷۵ درصد)';
      } else {
        ureaPerHa = UreaTables.highOC[climate][yieldTarget] || 280;
        tableRef = 'جدول ۱۰ (خاک با کربن آلی ۰.۷۵ تا ۱.۰ درصد)';
      }
      nKgPerHa = Math.round(ureaPerHa * 0.463);
    }

    // Equivalent Other Fertilizers
    const ammoniumSulfateKg = Math.round(ureaPerHa * 2.2);
    const ammoniumNitrateKg = Math.round(ureaPerHa * 1.5);

    // Splitting Scheme
    let splitSchedule = [];
    if (cultivationType === 'rainfed') {
      splitSchedule = [
        { stage: 'همزمان با کاشت (پاییز)', percent: '۶۶٪ (دو سوم)', amount: `${Math.round(ureaPerHa * 0.66)} کیلوگرم اوره`, desc: 'جایگذاری زیر بستر بذر در فاصله ۷ تا ۹ سانتی‌متر (ترجیحاً نیترات آمونیوم)' },
        { stage: 'سرک بهاره (نیمه دوم اسفند تا نیمه اول فروردین)', percent: '۳۴٪ (یک سوم)', amount: `${Math.round(ureaPerHa * 0.34)} کیلوگرم اوره`, desc: 'مشروط به وجود بارندگی بهاره در سطح مزرعه توزیع شود.' }
      ];
    } else if (soilTexture === 'light') {
      splitSchedule = [
        { stage: 'نوبت اول: همزمان با آب دوم (شروع پنجه‌زنی)', percent: '۲۵٪', amount: `${Math.round(ureaPerHa * 0.25)} کیلوگرم`, desc: 'قبل از یخبندان زمستانه' },
        { stage: 'نوبت دوم: تکمیل پنجه‌زنی (اسفند ماه)', percent: '۲۵٪', amount: `${Math.round(ureaPerHa * 0.25)} کیلوگرم`, desc: 'پس از گذر از سرمای زمستان' },
        { stage: 'نوبت سوم: ساقه‌دهی / تورم خوشه', percent: '۲۵٪', amount: `${Math.round(ureaPerHa * 0.25)} کیلوگرم`, desc: 'بیشترین نیاز نیتروژنی گندم' },
        { stage: 'نوبت چهارم: بعد از گلدهی / پر شدن دانه', percent: '۲۵٪', amount: `${Math.round(ureaPerHa * 0.25)} کیلوگرم`, desc: 'کودآبیاری یا محلول‌پاشی برای افزایش پروتئین دانه' }
      ];
    } else {
      // Heavy/Medium soil
      splitSchedule = [
        { stage: 'نوبت اول: مرحله آب دوم (شروع پنجه‌زنی)', percent: '۳۰ تا ۴۰٪', amount: `${Math.round(ureaPerHa * 0.35)} کیلوگرم`, desc: 'توسعه ریشه‌ها و ایجاد مقاومت سرمایی' },
        { stage: 'نوبت دوم: تکمیل پنجه‌زنی (بهاره)', percent: '۳۰ تا ۳۵٪', amount: `${Math.round(ureaPerHa * 0.30)} کیلوگرم`, desc: 'تحریک رشد رویشی قوی' },
        { stage: 'نوبت سوم: ساقه‌دهی تا تورم خوشه (شکم خوش)', percent: '۳۰ تا ۳۵٪', amount: `${Math.round(ureaPerHa * 0.35)} کیلوگرم`, desc: 'تأمین نیتروژن برای سنبله‌دهی و دانه' }
      ];
    }

    // Render results
    document.getElementById('ureaResultValue').textContent = ureaPerHa;
    document.getElementById('ureaEquivalentN').textContent = `${nKgPerHa} کیلوگرم N خالص`;
    document.getElementById('ureaEquivalentAS').textContent = `${ammoniumSulfateKg} کیلوگرم`;
    document.getElementById('ureaEquivalentAN').textContent = `${ammoniumNitrateKg} کیلوگرم`;
    document.getElementById('ureaTableRefBadge').textContent = tableRef;

    const timelineContainer = document.getElementById('ureaSplitTimeline');
    timelineContainer.innerHTML = splitSchedule.map(s => `
      <div class="schedule-stage">
        <h5>${s.stage} <span style="color:var(--primary);font-size:0.8rem">(${s.percent} - ${s.amount})</span></h5>
        <p>${s.desc}</p>
      </div>
    `).join('');

    // Foliar Note
    document.getElementById('ureaFoliarNote').innerHTML = `
      💡 <strong>توصیه محلول‌پاشی پروتئین دانه:</strong> ۷ روز پس از ۵۰٪ گلدهی، محلول‌پاشی اوره به مقدار <strong>۴ تا ۸ کیلوگرم در هکتار</strong> با غلظت حداکثر ۷ در هزار (همراه با سم سن گندم) موجب افزایش بارز پروتئین دانه می‌گردد.
    `;
  });
}

/* ==========================================================================
   2. Phosphorus Calculator Engine
   ========================================================================== */
function bindPhosphorusCalc() {
  const calcBtn = document.getElementById('btnCalculateP');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const isRainfed = document.getElementById('pCultivationType').value === 'rainfed';
    const soilP = parseFloat(document.getElementById('pSoilValue').value) || 0;
    const climate = document.getElementById('pClimate').value;
    const yieldTarget = parseInt(document.getElementById('pYield').value);
    const method = document.getElementById('pAppMethod').value; // broadcast vs band

    let tspKg = 0;
    let dapKg = 0;
    let p2o5Kg = 0;
    let statusText = '';
    let tableRef = '';

    if (isRainfed) {
      // Rainfed Table 18 (Critical level = 9 mg/kg)
      tableRef = 'جدول ۱۸ (فسفر دیم بر اساس آزمون خاک)';
      if (soilP >= 9) {
        tspKg = 0;
        statusText = 'فسفر خاک بالاتر از حد بحرانی دیم (۹ ppm) است. پاسخ به کود ناچیز است.';
      } else {
        const roundedP = Math.max(4, Math.min(9, Math.round(soilP)));
        const row = PhosphorusTables.rainfed[roundedP] || { p2o5: 28, fert: 60 };
        p2o5Kg = row.p2o5;
        tspKg = row.fert;
        dapKg = row.fert;
        statusText = `کمبود فسفر در دیمزار. نیاز به ${p2o5Kg} کیلوگرم P2O5 در هکتار.`;
      }
    } else {
      // Irrigated Tables 14-17 (Critical level = 15 mg/kg)
      if (soilP < 5) {
        tspKg = PhosphorusTables.pLess5[climate][yieldTarget] || 260;
        tableRef = 'جدول ۱۴ (فسفر خاک کمتر از ۵ ppm)';
        statusText = 'پاسخ خیلی زیاد (۷۵ تا ۱۰۰٪) به مصرف کود فسفری';
      } else if (soilP < 10) {
        tspKg = PhosphorusTables.p5to10[climate][yieldTarget] || 220;
        tableRef = 'جدول ۱۵ (فسفر خاک ۵ تا ۱۰ ppm)';
        statusText = 'پاسخ زیاد (۵۰ تا ۷۵٪) به مصرف کود فسفری';
      } else if (soilP < 12) {
        tspKg = PhosphorusTables.p10to12[climate][yieldTarget] || 130;
        tableRef = 'جدول ۱۶ (فسفر خاک ۱۰ تا ۱۲ ppm)';
        statusText = 'پاسخ متوسط به مصرف کود فسفری';
      } else if (soilP < 15) {
        tspKg = PhosphorusTables.p12to15[climate][yieldTarget] || 80;
        tableRef = 'جدول ۱۷ (فسفر خاک ۱۲ تا ۱۵ ppm)';
        statusText = 'پاسخ کم (زیر ۵۰٪) به مصرف کود فسفری';
      } else {
        tspKg = 0;
        tableRef = 'جدول ۱۳ (فسفر خاک بالاتر از حد بحرانی ۱۵ ppm)';
        statusText = 'خاک غنی از فسفر است و معمولاً نیازی به مصرف خاکی فسفر نیست.';
      }

      // Application method adjustment: Banding reduces requirement by 35-50%
      if (method === 'band' && tspKg > 0) {
        tspKg = Math.round(tspKg * 0.6); // 40% reduction
        statusText += ' | به دلیل مصرف نواری (کودکار-بذرکار در زیر بذر)، مصرف کود تا ۴۰٪ کاهش یافت.';
      }

      dapKg = tspKg;
      p2o5Kg = Math.round(tspKg * 0.46);
    }

    document.getElementById('pResultValue').textContent = tspKg;
    document.getElementById('pP2O5Equivalent').textContent = `${p2o5Kg} کیلوگرم P2O5 خالص`;
    document.getElementById('pDAPEquivalent').textContent = `${dapKg} کیلوگرم DAP`;
    document.getElementById('pStatusDesc').textContent = statusText;
    document.getElementById('pTableRefBadge').textContent = tableRef;
  });
}

/* ==========================================================================
   3. Potassium Calculator Engine
   ========================================================================== */
function bindPotassiumCalc() {
  const calcBtn = document.getElementById('btnCalculateK');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const soilK = parseFloat(document.getElementById('kSoilValue').value) || 0;
    const climate = document.getElementById('kClimate').value;
    const yieldTarget = parseInt(document.getElementById('kYield').value);
    const strategy = document.getElementById('kStrategy').value; // maintenance vs buildup
    const isRainfed = document.getElementById('kCultivationType').value === 'rainfed';

    let sopKg = 0;
    let k2oKg = 0;
    let mopKg = 0;
    let statusText = '';
    let tableRef = '';

    if (isRainfed) {
      sopKg = 0;
      tableRef = 'راهنمای دیم (مزارع دیم غالباً غنی از پتاسیم هستند)';
      statusText = 'در زراعت دیم به دلیل پتاسیم کافی خاک، مصرف خاکی پتاسیم معمولاً توصیه نمی‌شود.';
    } else {
      if (soilK < 100) {
        sopKg = PotassiumTables.k0to100[climate][yieldTarget] || 260;
        tableRef = 'جدول ۲۰ (پتاسیم خاک کمتر از ۱۰۰ ppm)';
        statusText = 'پاسخ خیلی زیاد (۷۵ تا ۱۰۰٪) به مصرف کود پتاسیمی';
      } else if (soilK < 150) {
        sopKg = PotassiumTables.k100to150[climate][yieldTarget] || 190;
        tableRef = 'جدول ۲۱ (پتاسیم خاک ۱۰۰ تا ۱۵۰ ppm)';
        statusText = 'پاسخ زیاد (۵۰ تا ۷۵٪) به مصرف کود پتاسیمی';
      } else if (soilK < 200) {
        sopKg = PotassiumTables.k150to200[climate][yieldTarget] || 90;
        tableRef = 'جدول ۲۲ (پتاسیم خاک ۱۵۰ تا ۲۰۰ ppm)';
        statusText = 'پاسخ متوسط (کمتر از ۵۰٪). خاک در آستانه حد بحرانی است.';

        if (strategy === 'buildup') {
          sopKg = 200; // 100 kg K2O
          statusText = 'استراتژی ذخیره پتاسیم در خاک فعال شد (مصرف ۲۰۰ کیلوگرم سولفات پتاسیم).';
        }
      } else {
        sopKg = 0;
        tableRef = 'جدول ۱۹ (پتاسیم خاک بالاتر از ۲۰۰ ppm)';
        statusText = 'پتاسیم خاک کافی است. مصرف خاکی نیاز نیست مگر کودآبیاری در عملکردهای بالای ۷ تن.';
      }

      k2oKg = Math.round(sopKg * 0.50);
      mopKg = Math.round(k2oKg / 0.60);
    }

    document.getElementById('kResultValue').textContent = sopKg;
    document.getElementById('kK2OEquivalent').textContent = `${k2oKg} کیلوگرم K2O`;
    document.getElementById('kMOPEquivalent').textContent = `${mopKg} کیلوگرم کلرید پتاسیم (MOP)`;
    document.getElementById('kStatusDesc').textContent = statusText;
    document.getElementById('kTableRefBadge').textContent = tableRef;
  });
}

/* ==========================================================================
   4. Salinity & Leaching Water Engine
   ========================================================================== */
function bindSalinityCalc() {
  const calcBtn = document.getElementById('btnCalculateSalinity');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const ece = parseFloat(document.getElementById('salinityECe').value) || 0;
    const esp = parseFloat(document.getElementById('salinityESP').value) || 0;
    const ph = parseFloat(document.getElementById('salinityPH').value) || 7.5;

    // Soil Classification (Table 24)
    let soilClass = 'غیر شور (Normal)';
    let soilClassBadge = 'success';
    if (ece > 4 && esp < 15) {
      soilClass = 'شور (Saline)';
      soilClassBadge = 'warning';
    } else if (ece <= 4 && esp >= 15) {
      soilClass = 'سدیمی / قلیایی (Sodic)';
      soilClassBadge = 'danger';
    } else if (ece > 4 && esp >= 15) {
      soilClass = 'شور و سدیمی (Saline-Sodic)';
      soilClassBadge = 'danger';
    }

    // Leaching water (Table 25)
    let matchedLeaching = SalinityTable.find(t => ece <= t.maxEC) || SalinityTable[SalinityTable.length - 1];

    // Nitrogen Adjustment in Saline soils
    let nAdjustmentText = 'توصیه نیتروژن بدون تغییر (مانند شرایط غیرشور).';
    if (ece >= 7 && ece <= 12) {
      nAdjustmentText = '➕ افزودن ۳۰٪ به میزان کود نیتروژنی محاسبه شده به دلیل کاهش راندمان جذب در شوری.';
    } else if (ece > 12) {
      nAdjustmentText = '➖ کاهش ۳۰٪ از میزان کود نیتروژنی (تنش شوری شدید و محدودیت پتانسیل عملکرد).';
    }

    // Potassium Adjustment in Saline soils
    let kAdjustmentText = 'پتاسیم معمولی.';
    if (ece >= 7 && ece <= 13) {
      kAdjustmentText = 'افزایش ۳۰٪ مصرف سولفات پتاسیم در دو قسط (همزمان با کاشت و ساقه‌دهی) جهت رقابت با یون سدیم.';
    }

    document.getElementById('salinitySoilClass').innerHTML = `<span class="badge-${soilClassBadge}">${soilClass}</span>`;
    document.getElementById('salinityWaterVolume').textContent = `${matchedLeaching.volumeM3} مترمکعب در هکتار`;
    document.getElementById('salinityWaterSchedule').textContent = matchedLeaching.leaching;
    document.getElementById('salinityWaterDesc').textContent = matchedLeaching.desc;
    document.getElementById('salinityNAdjustment').textContent = nAdjustmentText;
    document.getElementById('salinityKAdjustment').textContent = kAdjustmentText;
  });
}

/* ==========================================================================
   5. Conservation Agriculture & Residue Compensator
   ========================================================================== */
function bindResidueCalc() {
  const calcBtn = document.getElementById('btnCalculateResidue');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const cropType = document.getElementById('residueCropType').value;
    const stubbleWeight = parseFloat(document.getElementById('residueStubbleTons').value) || 0;
    const systemType = document.getElementById('caSystemType').value; // no-till vs min-till

    // Rates from page 64 of document:
    // Wheat/Barley: 35 kg Urea / ton stubble
    // Corn: 30 kg Urea / ton
    // Cotton/Sunflower: 25 kg Urea / ton
    // Veggies/Legumes: 20 kg Urea / ton
    let ureaPerTon = 35;
    if (cropType === 'corn') ureaPerTon = 30;
    else if (cropType === 'cotton' || cropType === 'sunflower') ureaPerTon = 25;
    else if (cropType === 'veggies') ureaPerTon = 20;

    let extraUreaKg = Math.round(stubbleWeight * ureaPerTon);
    let extraNkg = Math.round(extraUreaKg * 0.463);
    let maxAllowedExtraUrea = 90; // max 40 kg N extra

    if (extraUreaKg > maxAllowedExtraUrea) {
      extraUreaKg = maxAllowedExtraUrea;
    }

    let splitDesc = `
      <strong>روش تقسیط نیتروژن اضافی بقایا:</strong>
      <ul>
        <li>۴۰ تا ۵۰٪ (${Math.round(extraUreaKg * 0.45)} کیلوگرم اوره) همزمان با کاشت در سطح مزرعه توزیع و با آبیاری اول (خاک‌آب) به خاک داده شود.</li>
        <li>مابقی ۵۰ تا ۶۰٪ (${Math.round(extraUreaKg * 0.55)} کیلوگرم اوره) در دو نوبت سرک بهاره به کود اصلی اضافه شود.</li>
      </ul>
    `;

    document.getElementById('residueExtraUrea').textContent = `${extraUreaKg} کیلوگرم در هکتار`;
    document.getElementById('residueExtraN').textContent = `${extraNkg} کیلوگرم N خالص`;
    document.getElementById('residueSplitDetails').innerHTML = splitDesc;
  });
}

/* ==========================================================================
   6. Fertilizer Converter Tool (Appendix Table 2)
   ========================================================================== */
function renderConversionTable() {
  const tableBody = document.getElementById('conversionTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = ConversionFactors.map(c => `
    <tr>
      <td><span class="latin-num font-weight-bold">${c.from}</span></td>
      <td><span class="latin-num font-weight-bold">${c.to}</span></td>
      <td class="highlight-col"><span class="latin-num">${c.factor.toFixed(3)}</span></td>
      <td><code>${c.formula}</code></td>
    </tr>
  `).join('');
}

function bindConverterTool() {
  const btn = document.getElementById('btnRunConvert');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const inputVal = parseFloat(document.getElementById('convertInputValue').value) || 0;
    const factorIndex = parseInt(document.getElementById('convertSelectFactor').value) || 0;
    const selected = ConversionFactors[factorIndex];

    const result = (inputVal * selected.factor).toFixed(2);
    document.getElementById('convertResultBox').innerHTML = `
      <strong>${inputVal}</strong> واحد <span class="latin-num">${selected.from}</span> = 
      <strong style="color:var(--primary);font-size:1.3rem">${result}</strong> واحد <span class="latin-num">${selected.to}</span>
    `;
  });
}

/* ==========================================================================
   7. Visual Deficiency Clinic
   ========================================================================== */
function renderDeficiencyClinic(organFilter) {
  const container = document.getElementById('clinicCardsContainer');
  if (!container) return;

  const filtered = organFilter === 'all' 
    ? DeficiencyDB 
    : DeficiencyDB.filter(d => d.organ.includes(organFilter) || organFilter === 'all');

  container.innerHTML = filtered.map(item => `
    <div class="element-card" data-element-id="${item.id}">
      <div class="element-card-img-wrapper" style="background:linear-gradient(135deg, rgba(21,128,61,0.06), rgba(217,119,6,0.06))">
        <div style="font-size:3.5rem;opacity:0.85">${getDeficiencyEmoji(item.symbol)}</div>
        <span class="element-badge-cat">${item.type === 'macro' ? 'عنصر پرمصرف' : 'عنصر کم‌مصرف'}</span>
        <span class="element-symbol-tag">${item.symbol}</span>
      </div>
      <div class="element-card-body">
        <h3>کمبود ${item.element} (${item.symbol})</h3>
        <p class="symptom-preview">${item.summary}</p>
        <div class="element-meta-tags">
          <span class="meta-tag">📍 اندام: ${item.organFa}</span>
          <span class="meta-tag">🎯 حد بهینه: ${item.optimalContent}</span>
        </div>
        <button class="btn-detail-link" onclick="openDeficiencyModal('${item.id}')">مشاهده جزئیات، تصاویر و دستور درمان</button>
      </div>
    </div>
  `).join('');

  // Organ Filter buttons
  document.querySelectorAll('.organ-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-organ') === organFilter);
    btn.onclick = () => {
      AppState.selectedOrgan = btn.getAttribute('data-organ');
      renderDeficiencyClinic(AppState.selectedOrgan);
    };
  });
}

function getDeficiencyEmoji(symbol) {
  switch(symbol) {
    case 'N': return '🌿';
    case 'P': return '🌾';
    case 'K': return '🍂';
    case 'S': return '🌱';
    case 'Mg': return '🍃';
    case 'Zn': return '🪴';
    case 'Fe': return '📜';
    case 'Mn': return '🌾';
    case 'Cu': return '🥀';
    case 'B': return '🌻';
    default: return '🌾';
  }
}

window.openDeficiencyModal = function(id) {
  const item = DeficiencyDB.find(d => d.id === id);
  if (!item) return;

  const modal = document.getElementById('deficiencyModal');
  const title = document.getElementById('deficiencyModalTitle');
  const body = document.getElementById('deficiencyModalBody');

  title.innerHTML = `🔬 راهنمای تشخیصی کمبود ${item.element} (${item.symbol})`;
  body.innerHTML = `
    <div style="margin-bottom:1.25rem;">
      <div class="custom-callout tip">
        <div>
          <strong>محل بروز علائم در بوته:</strong> ${item.organFa}<br>
          <strong>حد بحرانی در آزمون خاک:</strong> ${item.soilCritical}<br>
          <strong>حد مطلوب در تجزیه گیاه:</strong> ${item.optimalContent}
        </div>
      </div>

      <h4 style="margin:1rem 0 0.5rem">📋 شرح تفصیلی علائم بالینی:</h4>
      <p style="line-height:1.8">${item.details}</p>

      <h4 style="margin:1rem 0 0.5rem">🩺 دستورالعمل اصلاح و تغذیه درمانی:</h4>
      <p style="background:var(--bg-subtle);padding:0.85rem;border-radius:var(--radius-sm);line-height:1.8">${item.remedy}</p>
    </div>
  `;

  modal.classList.add('active');
};

/* ==========================================================================
   8. Dynamic SVG Phenology Chart
   ========================================================================== */
function renderGrowthStageCharts() {
  const chartEl = document.getElementById('phenologyDynamicChart');
  if (!chartEl) return;

  chartEl.innerHTML = `
    <svg viewBox="0 0 800 320" style="width:100%;height:auto;font-family:Vazirmatn,sans-serif;">
      <defs>
        <linearGradient id="nGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#16a34a" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#16a34a" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="kGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d97706" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#d97706" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Axes Grid -->
      <line x1="60" y1="260" x2="760" y2="260" stroke="var(--border-medium)" stroke-width="2"/>
      <line x1="60" y1="40" x2="60" y2="260" stroke="var(--border-medium)" stroke-width="2"/>

      <!-- Y Axis Labels (kg/ha) -->
      <text x="50" y="265" text-anchor="end" font-size="12" fill="var(--text-light)">0</text>
      <text x="50" y="210" text-anchor="end" font-size="12" fill="var(--text-light)">50</text>
      <text x="50" y="150" text-anchor="end" font-size="12" fill="var(--text-light)">100</text>
      <text x="50" y="90" text-anchor="end" font-size="12" fill="var(--text-light)">150</text>
      <text x="50" y="45" text-anchor="end" font-size="12" fill="var(--text-light)">200 kg/ha</text>

      <!-- Grid lines -->
      <line x1="60" y1="205" x2="760" y2="205" stroke="var(--border-light)" stroke-dasharray="4"/>
      <line x1="60" y1="150" x2="760" y2="150" stroke="var(--border-light)" stroke-dasharray="4"/>
      <line x1="60" y1="95" x2="760" y2="95" stroke="var(--border-light)" stroke-dasharray="4"/>

      <!-- X Axis Stage Points (Feekes 1 to 11) -->
      <text x="80" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">ظهور</text>
      <text x="170" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">پنجه‌زنی</text>
      <text x="270" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">برگ پرچم</text>
      <text x="380" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">سنبله‌دهی</text>
      <text x="490" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">گلدهی</text>
      <text x="600" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">شیری/خمیری</text>
      <text x="720" y="285" text-anchor="middle" font-size="11" fill="var(--text-muted)">رسیدن دانه</text>

      <!-- K Uptake Curve (K2O - High early peak) -->
      <path d="M 80 255 Q 170 200 270 110 T 380 75 T 490 85 T 600 100 T 720 105 L 720 260 L 80 260 Z" fill="url(#kGrad)"/>
      <path d="M 80 255 Q 170 200 270 110 T 380 75 T 490 85 T 600 100 T 720 105" fill="none" stroke="#d97706" stroke-width="3"/>

      <!-- N Uptake Curve (Progressive until grain fill) -->
      <path d="M 80 255 Q 170 220 270 140 T 380 90 T 490 75 T 600 68 T 720 65 L 720 260 L 80 260 Z" fill="url(#nGrad)"/>
      <path d="M 80 255 Q 170 220 270 140 T 380 90 T 490 75 T 600 68 T 720 65" fill="none" stroke="#16a34a" stroke-width="3.5"/>

      <!-- P Uptake Curve (P2O5) -->
      <path d="M 80 258 Q 170 240 270 220 T 380 195 T 490 185 T 600 175 T 720 170 L 720 260 L 80 260 Z" fill="url(#pGrad)"/>
      <path d="M 80 258 Q 170 240 270 220 T 380 195 T 490 185 T 600 175 T 720 170" fill="none" stroke="#0284c7" stroke-width="3"/>

      <!-- Legend -->
      <rect x="520" y="20" width="230" height="40" rx="8" fill="var(--bg-card)" stroke="var(--border-light)"/>
      <line x1="535" y1="35" x2="555" y2="35" stroke="#16a34a" stroke-width="3"/>
      <text x="565" y="39" font-size="12" fill="var(--text-main)">نیتروژن (N)</text>
      
      <line x1="620" y1="35" x2="640" y2="35" stroke="#d97706" stroke-width="3"/>
      <text x="650" y="39" font-size="12" fill="var(--text-main)">پتاسیم (K2O)</text>

      <line x1="710" y1="35" x2="725" y2="35" stroke="#0284c7" stroke-width="3"/>
      <text x="730" y="39" font-size="12" fill="var(--text-main)">فسفر</text>
    </svg>
  `;
}

/* ==========================================================================
   9. Prescription Generator & Print System
   ========================================================================== */
function bindPrescriptionForm() {
  const btn = document.getElementById('btnGeneratePrescription');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const farmerName = document.getElementById('rxFarmerName').value || 'کشاورز پیشرو';
    const fieldLocation = document.getElementById('rxLocation').value || 'مزرعه نمونه';
    const fieldArea = parseFloat(document.getElementById('rxArea').value) || 1;
    const cultivation = document.getElementById('rxCultivation').value;
    const climate = document.getElementById('rxClimate').value;
    const targetYield = parseInt(document.getElementById('rxYield').value) || 5;

    // Quick calculation based on inputs
    let ureaPerHa = 320;
    let tspPerHa = 150;
    let sopPerHa = 120;
    let sulfurPerHa = 300;
    let zincPerHa = 30;

    if (cultivation === 'rainfed') {
      ureaPerHa = 120;
      tspPerHa = 60;
      sopPerHa = 0;
      sulfurPerHa = 0;
      zincPerHa = 20;
    }

    const totalUrea = Math.round(ureaPerHa * fieldArea);
    const totalTSP = Math.round(tspPerHa * fieldArea);
    const totalSOP = Math.round(sopPerHa * fieldArea);

    const container = document.getElementById('prescriptionOutput');
    container.style.display = 'block';
    container.innerHTML = `
      <div class="prescription-card">
        <div class="prescription-header">
          <h2>🌾 نسخه جامع مدیریت تلفیقی حاصلخیزی و کوددهی گندم</h2>
          <div class="prescription-watermark">منطبق بر دستورالعمل موسسه تحقیقات خاک و آب کشور (وزارت جهاد کشاورزی)</div>
          <div style="margin-top:0.75rem;font-size:0.88rem;color:var(--text-muted)">
            نام بهره‌بردار: <strong>${farmerName}</strong> | موقعیت مزرعه: <strong>${fieldLocation}</strong> | سطح زیر کشت: <strong>${fieldArea} هکتار</strong> | پتانسیل عملکرد: <strong>${targetYield} تن دانه در هکتار</strong>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>نوع کود پیشنهادی</th>
                <th>میزان در هر هکتار</th>
                <th>کل نیاز مزرعه (${fieldArea} هکتار)</th>
                <th>مرحله مصرف و شیوه کاربرد</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>کود اوره (۴۶٪ N)</strong></td>
                <td class="highlight-col">${ureaPerHa} kg/ha</td>
                <td><strong>${totalUrea} کیلوگرم</strong> (${Math.ceil(totalUrea/50)} کیسه)</td>
                <td>تقسیط در ۳ یا ۴ نوبت: آب دوم، تکمیل پنجه‌زنی بهاره و ساقه‌دهی</td>
              </tr>
              <tr>
                <td><strong>سوپرفسفات تریپل یا DAP</strong></td>
                <td class="highlight-col">${tspPerHa} kg/ha</td>
                <td><strong>${totalTSP} کیلوگرم</strong> (${Math.ceil(totalTSP/50)} کیسه)</td>
                <td>۱۰۰٪ قبل یا همزمان با کاشت به صورت نواری در زیر بذر (کودکار)</td>
              </tr>
              <tr>
                <td><strong>سولفات پتاسیم (SOP)</strong></td>
                <td class="highlight-col">${sopPerHa} kg/ha</td>
                <td><strong>${totalSOP} کیلوگرم</strong> (${Math.ceil(totalSOP/50)} کیسه)</td>
                <td>پایه قبل کاشت + کودآبیاری در مرحله ساقه رفتن و گلدهی</td>
              </tr>
              <tr>
                <td><strong>گوگرد بنتونیت‌دار + تیوباسیلوس</strong></td>
                <td class="highlight-col">${sulfurPerHa} kg/ha</td>
                <td><strong>${sulfurPerHa * fieldArea} کیلوگرم</strong></td>
                <td>۲ الی ۴ ماه قبل از کشت مخلوط با خاک (بهبود جذب P, Fe, Zn)</td>
              </tr>
              <tr>
                <td><strong>سولفات روی (ZnSO4)</strong></td>
                <td class="highlight-col">${zincPerHa} kg/ha</td>
                <td><strong>${zincPerHa * fieldArea} کیلوگرم</strong></td>
                <td>مصرف خاکی قبل کاشت یا محلول‌پاشی در پنجه‌زنی (۳ در هزار)</td>
              </tr>
              <tr>
                <td><strong>اسید هیومیک + اسید آمینه</strong></td>
                <td class="highlight-col">۱ تا ۲ لیتر/هکتار</td>
                <td><strong>${fieldArea * 2} لیتر</strong></td>
                <td>بذرمال هنگام کشت + محلول‌پاشی هنگام مواجهه با تنش سرما/خشکی</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
          <button class="btn-primary-action" onclick="window.print()">🖨️ چاپ و صدور فایل PDF نسخه</button>
          <div style="font-size:0.8rem;color:var(--text-muted);text-align:left;">
            <span>ناظر و تدوین دیجیتال: <strong>صابر حیدری</strong> (عضو هیات علمی مرکز تحقیقات کشاورزی جنوب کرمان)</span><br>
            <span>تاریخ صدور: ${new Date().toLocaleDateString('fa-IR')}</span>
          </div>
        </div>
      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ==========================================================================
   10. Search Dialog Engine
   ========================================================================== */
function setupSearch() {
  const searchModal = document.getElementById('searchModal');
  const searchInput = document.getElementById('searchInput');
  const triggerBtn = document.getElementById('searchTriggerBtn');
  const resultsContainer = document.getElementById('searchResultsList');

  const SearchIndex = [
    { title: 'محاسبه‌گر کود اوره و نیتروژن', view: 'calculators', desc: 'جداول ۸ تا ۱۲ بر اساس کربن آلی و اقلیم' },
    { title: 'محاسبه‌گر فسفر (سوپرفسفات تریپل و DAP)', view: 'calculators', desc: 'جداول ۱۴ تا ۱۸ و روش نواری زیر بذر' },
    { title: 'محاسبه‌گر پتاسیم و استراتژی ذخیره', view: 'calculators', desc: 'جداول ۱۹ تا ۲۲ بر اساس آزمون خاک' },
    { title: 'محاسبه آبشویی و اصلاح خاک‌های شور', view: 'calculators', desc: 'جداول ۲۴ و ۲۵ و تعدیل نیتروژن در شوری' },
    { title: 'نیتروژن اضافی برای تجزیه کلش و بقایا', view: 'calculators', desc: 'کشاورزی حفاظتی و ۳۵ کیلوگرم اوره به ازای هر تن کلش' },
    { title: 'کلینیک تشخیص کمبود روی (Zn)', view: 'clinic', desc: 'برنز کدر، سوختگی مرکز برگ و چین‌خوردگی' },
    { title: 'کلینیک تشخیص کمبود آهن (Fe)', view: 'clinic', desc: 'کلروز نواری رگبرگی و بوته ایستاده' },
    { title: 'کلینیک تشخیص کمبود پتاسیم (K)', view: 'clinic', desc: 'سوختگی حاشیه برگ و پیکان سبز' },
    { title: 'کلینیک تشخیص کمبود گوگرد (S)', view: 'clinic', desc: 'زردی برگ‌های جوان و نسبت N/S' },
    { title: 'مدیریت تنش سرما و یخبندان', view: 'stress', desc: 'جدول ۲۷ دماهای بحرانی و نقش اسیدهای آمینه و پتاسیم' },
    { title: 'مدیریت تنش گرما و سوختگی برگ پرچم', view: 'stress', desc: 'کاهش وزن هزار دانه و آبیاری به موقع' },
    { title: 'مقیاس‌های فیکس (Feekes) و زادکس (Zadoks)', view: 'phenology', desc: 'مراحل نمو گندم و جذب تجمعی عناصر' },
    { title: 'مبدل ضرایب کودی و فرمول‌های شیمیایی', view: 'converter', desc: 'جدول پیوست ۲ کلیه ضرایب تبدیل اکسیدی و عنصری' },
    { title: 'دانشنامه کامل و متن ۵ فصل کتابچه', view: 'library', desc: 'مطالعه کامل پیشگفتار، روش‌های نمونه‌برداری و منابع' }
  ];

  if (triggerBtn && searchModal) {
    triggerBtn.addEventListener('click', () => {
      searchModal.classList.add('active');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        renderSearchResults('');
      }
    });
  }

  // Ctrl + K shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchModal.classList.add('active');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        renderSearchResults('');
      }
    }
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });
  }

  function renderSearchResults(query) {
    if (!resultsContainer) return;
    const q = query.trim().toLowerCase();
    const filtered = q === '' 
      ? SearchIndex.slice(0, 6) 
      : SearchIndex.filter(item => item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q));

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div style="padding:1rem;color:var(--text-light);text-align:center">موردی یافت نشد.</div>';
      return;
    }

    resultsContainer.innerHTML = filtered.map(item => `
      <div class="search-result-item" onclick="selectSearchResult('${item.view}')">
        <h4 style="font-size:0.95rem;margin-bottom:0.2rem">${item.title}</h4>
        <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:0">${item.desc}</p>
      </div>
    `).join('');
  }

  window.selectSearchResult = function(viewId) {
    searchModal.classList.remove('active');
    navigateTo(viewId);
  };
}

/* ==========================================================================
   11. Modal Setup
   ========================================================================== */
function setupModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });

    const closeBtn = overlay.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }
  });
}
