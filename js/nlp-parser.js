/**
 * Robust Egyptian Arabic Date & Trip Parser
 * Strict implementation of date formula with zero regression.
 */

class EgyptianTripParser {
  constructor(storage = null) {
    this.storage = storage;

    // Strict Day of Week Mapping:
    // "السبت" -> 6, "الحد" / "الأحد" -> 0, "الاتنين" / "الاثنين" -> 1, "التلات" / "الثلاثاء" -> 2,
    // "الاربع" / "الأربعاء" -> 3, "الخميس" -> 4, "الجمعة" -> 5
    this.daysMapping = [
      {
        targetDay: 6,
        name: 'السبت',
        definiteTokens: ['السبت'],
        bareTokens: ['سبت']
      },
      {
        targetDay: 0,
        name: 'الأحد',
        definiteTokens: ['الحد', 'الأحد', 'الاحد'],
        bareTokens: ['حد', 'أحد']
      },
      {
        targetDay: 1,
        name: 'الاثنين',
        definiteTokens: ['الاتنين', 'الاثنين', 'الإثنين'],
        bareTokens: ['اتنين', 'اثنين', 'إثنين']
      },
      {
        targetDay: 2,
        name: 'الثلاثاء',
        definiteTokens: ['التلات', 'الثلاثاء', 'الثلاث'],
        bareTokens: ['تلات', 'ثلاثاء', 'ثلاث']
      },
      {
        targetDay: 3,
        name: 'الأربعاء',
        definiteTokens: ['الاربع', 'الأربعاء', 'الاربعاء'],
        bareTokens: ['اربع', 'أربع', 'أربعاء']
      },
      {
        targetDay: 4,
        name: 'الخميس',
        definiteTokens: ['الخميس'],
        bareTokens: ['خميس']
      },
      {
        targetDay: 5,
        name: 'الجمعة',
        definiteTokens: ['الجمعة'],
        bareTokens: ['جمعة']
      }
    ];

    this.numberWords = {
      'واحد': 1, 'واحدة': 1, 'واحده': 1,
      'اتنين': 2, 'إتنين': 2, 'اثنين': 2, 'إثنين': 2,
      'تلاتة': 3, 'ثلاثة': 3, 'تلاته': 3, 'ثلاثه': 3,
      'أربعة': 4, 'اربعة': 4, 'اربعه': 4,
      'خمسة': 5, 'خمست': 5, 'خمسه': 5,
      'ستة': 6, 'سته': 6,
      'سبعة': 7, 'سبعه': 7,
      'تمانية': 8, 'ثمانية': 8, 'تمانيه': 8, 'ثمانيه': 8,
      'تسعة': 9, 'تسعه': 9,
      'عشرة': 10, 'عشره': 10,
      'حداشر': 11, 'أحد عشر': 11,
      'اتناشر': 12, 'اثنا عشر': 12
    };

    this.clientPrefixRegexes = [
      /(?:مع\s+)?(?:لأستاذة?|لأستاذه|أستاذة?|أستاذه|استاذة?|استاذه)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للباشا|باشا|الباشا)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للكابتن|كابتن|الكابتن)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:عم|العم|لعم)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للدكتور|دكتور|دكتورة|دكتوره|الدكتور|الدكتورة)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للمدام|مدام|المدام)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للحاج|حاج|حاجة|حاجه|الحاج|الحاجة)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /(?:مع\s+)?(?:للمهندس|مهندس|مهندسة|مهندسه|المهندس)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i,
      /مع\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/i
    ];
  }

  parse(rawTranscript) {
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return this.createEmptyTrip();
    }

    const text = rawTranscript.trim();

    // 1. Strict Date Calculation
    const dateInfo = this.resolveDate(text);

    // 2. 24-Hour Time Calculation
    const timeInfo = this.resolveTime(text);

    // 3. Category
    const categoryInfo = this.resolveCategory(text);

    // 4. Client Name
    const clientInfo = this.resolveClient(text);

    // 5. Fare
    const fare = this.resolveFare(text);

    return {
      id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      raw: text,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      type: categoryInfo.type,
      typeLabel: categoryInfo.label,
      typeIcon: categoryInfo.icon,
      date: dateInfo.isoDate,       // YYYY-MM-DD
      dateDisplay: dateInfo.display,
      time: timeInfo.timeString,     // HH:mm
      timeDisplay: timeInfo.display,
      hour24: timeInfo.hour24,
      minutes: timeInfo.minutes,
      price: fare,
      status: 'upcoming',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * ROBUST DATE RESOLVER
   */
  resolveDate(text) {
    const today = new Date();
    const clean = this.normalize(text);

    let targetDate = new Date(today);
    let display = '';
    let resolved = false;

    // A) Relative keywords
    if (/بعد\s+(?:بكره|بكرة|غد)/.test(clean)) {
      targetDate.setDate(today.getDate() + 2);
      display = 'بعد بكرة (' + this.formatDateAr(targetDate) + ')';
      resolved = true;
    } else if (/(?:^|[\s،,])(?:بكره|بكرة|غدا|غداً)(?:[\s،,]|$)/.test(clean)) {
      targetDate.setDate(today.getDate() + 1);
      display = 'بكرة (' + this.formatDateAr(targetDate) + ')';
      resolved = true;
    } else if (/(?:^|[\s،,])(?:النهارده|النهاردة|اليوم)(?:[\s،,]|$)/.test(clean)) {
      targetDate = new Date(today);
      display = 'النهاردة (' + this.formatDateAr(targetDate) + ')';
      resolved = true;
    }

    // B) Mentioned Day Formula
    if (!resolved) {
      const currentDay = today.getDay();

      for (const dayItem of this.daysMapping) {
        const defPattern = dayItem.definiteTokens.join('|');
        const defRegex = new RegExp(`(?:^|[\\s،,.:;!؟])(?:يوم\\s+)?(${defPattern})(?:[\\s،,.:;!؟]|$)`, 'i');

        const barePattern = dayItem.bareTokens.join('|');
        const bareRegex = new RegExp(`(?:^|[\\s،,.:;!؟])(?:يوم\\s+)(${barePattern})(?:[\\s،,.:;!؟]|$)`, 'i');

        if (defRegex.test(clean) || bareRegex.test(clean)) {
          const targetDay = dayItem.targetDay;

          // Exact formula requested by user
          let diff = (targetDay - currentDay + 7) % 7;
          if (diff === 0) diff = 7; // If today is Tuesday and he says Tuesday, set to next Tuesday

          targetDate = new Date(today);
          targetDate.setDate(today.getDate() + diff);

          display = `يوم ${dayItem.name} (${this.formatDateAr(targetDate)})`;
          resolved = true;
          break;
        }
      }
    }

    // Default fallback only if no day or relative word mentioned
    if (!resolved) {
      display = 'النهاردة (' + this.formatDateAr(targetDate) + ')';
    }

    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    return { targetDate, isoDate, display };
  }

  /**
   * 24-HOUR TIME CONVERTER
   */
  resolveTime(text) {
    const clean = this.normalize(text);
    let hour = null;
    let minutes = 0;
    let period = null;

    if (/بالليل|بليل|مساء|مسا|العشا|المغرب/.test(clean)) {
      period = 'pm';
    } else if (/الصبح|صباحا|الفجر|بدري/.test(clean)) {
      period = 'am';
    } else if (/العصر|عصرا/.test(clean)) {
      period = 'afternoon';
    } else if (/الظهر|ظهرا|الضهر/.test(clean)) {
      period = 'noon';
    }

    let fraction = 0;
    let isMinus = false;
    if (/ونص|نصف/.test(clean)) fraction = 30;
    else if (/وربع/.test(clean)) fraction = 15;
    else if (/وتلت|وثلث/.test(clean)) fraction = 20;
    else if (/الا ربع|إلا ربع/.test(clean)) { fraction = 45; isMinus = true; }
    else if (/الا تلت|إلا تلت|الا ثلث/.test(clean)) { fraction = 40; isMinus = true; }
    else if (/وخمسه|وخمسة/.test(clean)) fraction = 5;
    else if (/وعشره|وعشرة/.test(clean)) fraction = 10;

    // Digits
    const digitMatch = clean.match(/(?:الساعه|ساعه)?\s*(\d{1,2})(?::(\d{2}))?/);
    if (digitMatch && digitMatch[1]) {
      hour = parseInt(digitMatch[1], 10);
      if (digitMatch[2]) {
        minutes = parseInt(digitMatch[2], 10);
      } else {
        minutes = fraction;
        if (isMinus) hour -= 1;
      }
    } else {
      // Words
      for (const [w, num] of Object.entries(this.numberWords)) {
        const normW = this.normalize(w);
        const wRegex = new RegExp(`(?:الساعه\\s+)?(?:^|[\\s،,])(${normW})(?:[\\s،,]ונص|وربع|وتلت|وثلث|الا ربع|إلا ربع|$)`);
        if (wRegex.test(clean)) {
          hour = num;
          minutes = fraction;
          if (isMinus) hour -= 1;
          break;
        }
      }
    }

    if (hour === null) {
      const now = new Date();
      hour = (now.getHours() + 1) % 24;
      minutes = 0;
    }

    if (period === 'pm') {
      if (hour < 12) hour += 12;
    } else if (period === 'am') {
      if (hour === 12) hour = 0;
    } else if (period === 'afternoon') {
      if (hour < 12) hour += 12;
    } else if (period === 'noon') {
      if (hour === 1 || hour === 2) hour += 12;
    } else {
      // Automatic Egyptian context: 1 to 6 without "الصبح" is PM
      if (hour >= 1 && hour <= 6) hour += 12;
    }

    hour = Math.max(0, Math.min(23, hour));
    minutes = Math.max(0, Math.min(59, minutes));

    const hh = String(hour).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const timeString = `${hh}:${mm}`;

    const ampmLabel = hour >= 12 ? 'مساءً' : 'صباحاً';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const minPart = minutes > 0 ? `:${mm}` : '';
    const display = `الساعة ${displayHour}${minPart} ${ampmLabel} (${timeString})`;

    return { hour24: hour, minutes, timeString, display };
  }

  /**
   * CATEGORY
   */
  resolveCategory(text) {
    const clean = this.normalize(text);
    if (/مطار|المطار|سفنكس|برج العرب|صاله|صالة|تيرمنال|طياره|طيارة|طيران/.test(clean)) {
      return { type: 'airport', label: 'مشوار مطار', icon: '✈️' };
    }
    if (/سفر|محافظات|اسكندريه|إسكندرية|اسكندرية|شرم|الغردقه|الغردقة|الجونة|الساحل|سوهاج|طنطا|المنصوره|المنصورة|طريق|السخنه|السخنة/.test(clean)) {
      return { type: 'travel', label: 'سفر محافظات', icon: '🛣️' };
    }
    if (/مدرسه|مدرسة|جامعه|جامعة|حضانه|حضانة|كوليدج|اكاديميه|أكاديمية|توصيله الصبح|توصيلة الصبح|الاولاد|الأولاد/.test(clean)) {
      return { type: 'school', label: 'توصيلة مدرسة', icon: '🎒' };
    }
    return { type: 'general', label: 'مشوار خاص VIP', icon: '🚗' };
  }

  /**
   * CLIENT NAME & AUTO PHONE LOOKUP
   */
  resolveClient(text) {
    let name = '';
    let phone = '';

    for (const regex of this.clientPrefixRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const rawName = match[1].trim();
        const cleanName = this.filterStopWords(rawName);
        if (cleanName && cleanName.length >= 2) {
          if (/لأستاذ|أستاذ|استاذ/.test(match[0])) name = `أستاذ ${cleanName}`;
          else if (/للباشا|باشا|الباشا/.test(match[0])) name = `الباشا ${cleanName}`;
          else if (/كابتن|الكابتن/.test(match[0])) name = `كابتن ${cleanName}`;
          else if (/عم|العم|لعم/.test(match[0])) name = `عم ${cleanName}`;
          else if (/دكتور|دكتورة/.test(match[0])) name = `دكتور ${cleanName}`;
          else if (/مدام|المدام/.test(match[0])) name = `مدام ${cleanName}`;
          else if (/حاج|الحاج/.test(match[0])) name = `حاج ${cleanName}`;
          else if (/مهندس/.test(match[0])) name = `مهندس ${cleanName}`;
          else name = cleanName;
          break;
        }
      }
    }

    if (!name) name = 'عميل خاص';

    // Auto attach cached phone number
    if (this.storage && typeof this.storage.findPhoneByName === 'function') {
      const cachedPhone = this.storage.findPhoneByName(name);
      if (cachedPhone) phone = cachedPhone;
    }

    return { name, phone };
  }

  filterStopWords(wordsStr) {
    const stopWords = [
      'يوم', 'السبت', 'الحد', 'الأحد', 'الاحد', 'الاتنين', 'الاثنين', 'التلات', 'الثلاثاء',
      'الاربع', 'الأربعاء', 'الخميس', 'الجمعة', 'بكره', 'بكرة', 'النهارده', 'النهاردة',
      'الساعه', 'الساعة', 'مطار', 'سفر', 'بـ', 'جنيه', 'حساب', 'مشوار', 'في', 'من', 'إلى'
    ];
    const tokens = wordsStr.split(/\s+/);
    const valid = [];
    for (const t of tokens) {
      const norm = this.normalize(t);
      if (stopWords.includes(norm)) break;
      valid.push(t);
    }
    return valid.join(' ').trim();
  }

  /**
   * FARE
   */
  resolveFare(text) {
    if (/ألفين|الفين/.test(text)) return 2000;
    if (/ألف|الف/.test(text) && /جنيه|ج/.test(text)) return 1000;

    const match = text.match(/(?:بـ?|حساب|أجرة|اجرة|سعر|بمبلغ)?\s*(\d{2,5})\s*(?:جنيه|ج\.?م|ج)?/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  normalize(str) {
    if (!str) return '';
    return str
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[ـ]/g, '')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  formatDateAr(date) {
    const day = date.getDate();
    const monthsAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return `${day} ${monthsAr[date.getMonth()]}`;
  }

  createEmptyTrip() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return {
      id: 'trip_' + Date.now(),
      raw: '',
      clientName: 'عميل جديد',
      clientPhone: '',
      type: 'general',
      typeLabel: 'مشوار خاص',
      typeIcon: '🚗',
      date: `${y}-${m}-${d}`,
      dateDisplay: 'النهاردة',
      time: '12:00',
      timeDisplay: 'الساعة 12:00 ظهراً (12:00)',
      hour24: 12,
      minutes: 0,
      price: null,
      status: 'upcoming',
      createdAt: new Date().toISOString()
    };
  }
}

window.EgyptianTripParser = EgyptianTripParser;
