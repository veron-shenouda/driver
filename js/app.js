/**
 * Production-Ready Driver Application Controller
 * Minimal Fintech Design System, Live Arabic Clock, Alarm Sync, Voice Scheduler, Data Recovery
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tripsContainer = document.getElementById('tripsContainer');
  const tripsCountBadge = document.getElementById('tripsCountBadge');
  const voiceFabTouch = document.getElementById('voiceFabTouch');
  const voiceCard = document.querySelector('.voice-card');
  const voiceBadge = document.getElementById('voiceBadge');
  const voiceStatusTitle = document.getElementById('voiceStatusTitle');
  const voiceStatusSub = document.getElementById('voiceStatusSub');

  const toastBar = document.getElementById('toastBar');
  const toastText = document.getElementById('toastText');

  const btnBatteryFix = document.getElementById('btnBatteryFix');
  const btnTestAlarm = document.getElementById('btnTestAlarm');
  const btnImportContact = document.getElementById('btnImportContact');
  const btnQuickAddTrip = document.getElementById('btnQuickAddTrip');

  // Live Clock Elements
  const liveClockTime = document.getElementById('liveClockTime');
  const liveClockPeriod = document.getElementById('liveClockPeriod');
  const liveClockDate = document.getElementById('liveClockDate');

  // Modal Elements
  const modalLayer = document.getElementById('modalLayer');
  const btnOpenManual = document.getElementById('btnOpenManual');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const cleanManualForm = document.getElementById('cleanManualForm');

  /* ================== 1. MINIMAL LIVE REAL-TIME CLOCK ================== */
  function updateLiveClock() {
    const now = new Date();

    // 12-Hour format
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const isPm = hours >= 12;
    const periodArabic = isPm ? 'م' : 'ص';

    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, '0');

    if (liveClockTime) {
      liveClockTime.textContent = `${hoursStr}:${minutes}:${seconds}`;
    }
    if (liveClockPeriod) {
      liveClockPeriod.textContent = periodArabic;
    }
    if (liveClockDate) {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      liveClockDate.textContent = now.toLocaleDateString('ar-EG', options);
    }
  }

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  /* ================== 2. TEST ALARM TRIGGER ================== */
  if (btnTestAlarm) {
    btnTestAlarm.addEventListener('click', () => {
      showToast('تشغيل تجربة منبه النظام الصارم');
      if (window.nativeAlarmScheduler) {
        window.nativeAlarmScheduler.testAlarmSound(() => {
          showToast('تم إيقاف صوت التنبيه');
        });
      }
    });
  }

  /* ================== 3. ZERO-CLICK VOICE SCHEDULER ================== */
  const voiceScheduler = new window.VoiceScheduler({
    onTripCreated: async (savedTrip) => {
      showToast(`تم حفظ مشوار: ${savedTrip.clientName}`);
      if (window.nativeAlarmScheduler) {
        await window.nativeAlarmScheduler.scheduleAlarm(savedTrip);
      }
      renderTrips();
    },
    onStateChange: (state, message) => {
      if (!voiceCard) return;

      if (state === 'listening') {
        voiceCard.classList.add('listening');
        if (voiceBadge) voiceBadge.textContent = 'جارٍ الاستماع...';
        if (voiceStatusTitle) voiceStatusTitle.textContent = 'جارٍ الاستماع... اتكلم يا كابتن';
        if (voiceStatusSub) voiceStatusSub.textContent = 'تحدث بوضوح باسم العميل والموعد والوجهة';
      } else if (state === 'processing') {
        voiceCard.classList.remove('listening');
        if (voiceBadge) voiceBadge.textContent = 'معالجة';
        if (voiceStatusTitle) voiceStatusTitle.textContent = 'جارٍ الفهم والحفظ التلقائي...';
        if (voiceStatusSub) voiceStatusSub.textContent = 'جاري تسجيل المشوار وجدولة المنبه';
      } else if (state === 'committed') {
        voiceCard.classList.remove('listening');
        if (voiceBadge) voiceBadge.textContent = 'تم الحفظ';
        if (voiceStatusTitle) voiceStatusTitle.textContent = message || 'تم حفظ المشوار وتفعيل المنبه';
        if (voiceStatusSub) voiceStatusSub.textContent = 'تم إدراج الرحلة في الجدول بنجاح';
      } else {
        voiceCard.classList.remove('listening');
        if (voiceBadge) voiceBadge.textContent = 'جاهز';
        if (voiceStatusTitle) voiceStatusTitle.textContent = 'اضغط وتحدث لتسجيل مشوار فوري';
        if (voiceStatusSub) voiceStatusSub.textContent = 'مثال: "مشوار للمطار بكرة 6 الصبح بـ 400 جنيه"';
      }
    },
    onError: (err) => {
      showToast(err);
    }
  });

  if (voiceFabTouch) {
    voiceFabTouch.addEventListener('click', async () => {
      if (window.soundEffects) window.soundEffects.init();
      await voiceScheduler.startListening();
    });
  }

  /* ================== 4. MINIMALIST TRIPS RENDERING & RECOVERY ================== */
  function renderTrips() {
    const trips = window.captainStorage.getTrips();
    if (!tripsContainer) return;

    if (tripsCountBadge) {
      tripsCountBadge.textContent = `${trips.length} ${trips.length === 1 ? 'رحلة' : 'رحلات'}`;
    }

    if (trips.length === 0) {
      tripsContainer.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="empty-state-text">لا توجد رحلات مجدولة لليوم</div>
        </div>
      `;
      return;
    }

    tripsContainer.innerHTML = trips.map(trip => {
      const alarmIntentUri = window.nativeAlarmScheduler
        ? window.nativeAlarmScheduler.getAndroidClockIntentUri(trip)
        : '#';

      const isCompleted = trip.status === 'completed';
      const cleanType = trip.typeLabel ? trip.typeLabel.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : 'مشوار خاص';

      return `
        <div class="trip-card ${isCompleted ? 'completed' : ''}" data-id="${trip.id}">
          <div class="trip-card-top">
            <span class="trip-tag">
              ${cleanType}
            </span>
            <span class="trip-fare">${trip.price ? trip.price + ' ج.م' : 'بدون تحديد'}</span>
          </div>

          <div class="trip-client-info">
            <span class="trip-client-name">${escapeHtml(trip.clientName)}</span>
            ${trip.clientPhone ? `
              <span class="trip-client-phone btn-card-call" data-id="${trip.id}">
                ${trip.clientPhone}
              </span>
            ` : `
              <span class="trip-client-phone btn-prompt-phone" data-id="${trip.id}" style="color: var(--text-muted)">
                + إضافة هاتف
              </span>
            `}
          </div>

          <div class="trip-timing-row">
            <div class="timing-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${escapeHtml(trip.dateDisplay || trip.date)}</span>
            </div>
            <div class="timing-badge highlight">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${escapeHtml(trip.timeDisplay || trip.time)}</span>
            </div>
          </div>

          <div class="trip-actions-row">
            <!-- Direct Alarm Anchor -->
            <a href="${alarmIntentUri}" class="btn-card-alarm btn-action-alarm" data-id="${trip.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>ضبط منبه</span>
            </a>

            <!-- Call -->
            <button class="btn-card-small call btn-card-call" data-id="${trip.id}" title="اتصال">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>اتصال</span>
            </button>

            <!-- WhatsApp -->
            <button class="btn-card-small btn-card-wa" data-id="${trip.id}" title="واتساب">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>واتساب</span>
            </button>

            <!-- Complete / Delete -->
            ${!isCompleted ? `
              <button class="btn-card-small btn-card-complete" data-id="${trip.id}" title="إنهاء المشوار">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>تم</span>
              </button>
            ` : `
              <button class="btn-card-small delete btn-card-delete" data-id="${trip.id}" title="حذف">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>حذف</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    attachTripEvents();
  }

  function attachTripEvents() {
    // Alarm click
    document.querySelectorAll('.btn-action-alarm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (trip && window.nativeAlarmScheduler && window.nativeAlarmScheduler.isNative) {
          e.preventDefault();
          window.nativeAlarmScheduler.scheduleAlarm(trip);
          if (window.soundEffects) window.soundEffects.playSuccessChime();
          showToast('تم تأكيد ضبط منبه النظام الصارم');
        }
      });
    });

    // Add phone prompt
    document.querySelectorAll('.btn-prompt-phone').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (trip) promptAndSetPhone(trip);
      });
    });

    // Call
    document.querySelectorAll('.btn-card-call').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (!trip) return;

        if (trip.clientPhone) {
          window.location.href = `tel:${trip.clientPhone}`;
        } else {
          promptAndSetPhone(trip);
        }
      });
    });

    // WhatsApp
    document.querySelectorAll('.btn-card-wa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (!trip) return;

        if (trip.clientPhone) {
          let cleanPhone = trip.clientPhone.replace(/[^0-9]/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = '20' + cleanPhone.substring(1);
          const msg = encodeURIComponent(`السلام عليكم يا فندم، بخصوص مشوار حضرتك يوم ${trip.dateDisplay || 'المحدد'}.`);
          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
        } else {
          promptAndSetPhone(trip);
        }
      });
    });

    // Complete
    document.querySelectorAll('.btn-card-complete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        window.captainStorage.completeTrip(tripId);
        if (window.nativeAlarmScheduler) {
          window.nativeAlarmScheduler.cancelAlarm(tripId);
        }
        if (window.soundEffects) window.soundEffects.playSuccessChime();
        showToast('تم إنهاء المشوار بنجاح');
        renderTrips();
      });
    });

    // Delete
    document.querySelectorAll('.btn-card-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        window.captainStorage.deleteTrip(tripId);
        if (window.nativeAlarmScheduler) {
          window.nativeAlarmScheduler.cancelAlarm(tripId);
        }
        showToast('تم حذف المشوار');
        renderTrips();
      });
    });
  }

  function promptAndSetPhone(trip) {
    const entered = prompt(`ادخل رقم هاتف العميل (${trip.clientName}):`, '01');
    if (entered && entered.trim()) {
      window.captainStorage.updateTripPhone(trip.id, entered.trim());
      showToast('تم حفظ رقم الهاتف');
      renderTrips();
    }
  }

  /* ================== 5. CONTACT IMPORT ================== */
  if (btnImportContact) {
    btnImportContact.addEventListener('click', async () => {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
          const picked = await navigator.contacts.select(['name', 'tel'], { multiple: false });
          if (picked && picked[0]) {
            const rawName = (picked[0].name && picked[0].name[0]) || '';
            const rawTel = (picked[0].tel && picked[0].tel[0]) || '';

            if (rawTel) {
              const cleanPhone = window.captainStorage.normalizePhone(rawTel);
              const cleanName = rawName || 'عميل مسجل';
              window.captainStorage.saveClientContact(cleanName, cleanPhone);

              const manualPhoneInput = document.getElementById('manualPhone');
              const manualNameInput = document.getElementById('manualName');
              if (manualPhoneInput) manualPhoneInput.value = cleanPhone;
              if (manualNameInput && !manualNameInput.value) manualNameInput.value = cleanName;

              showToast(`تم سحب رقم: ${cleanName}`);
            }
          }
        } catch (ex) {
          console.warn('Contact picker error:', ex);
        }
      } else {
        const name = prompt('اسم العميل:', '');
        if (!name) return;
        const phone = prompt('رقم هاتف العميل:', '01');
        if (phone) {
          window.captainStorage.saveClientContact(name, phone);
          showToast(`تم حفظ رقم العميل: ${name}`);
        }
      }
    });
  }

  /* ================== 6. BATTERY EXEMPTION TRIGGER ================== */
  if (btnBatteryFix) {
    btnBatteryFix.addEventListener('click', () => {
      if (window.nativeAlarmScheduler && window.nativeAlarmScheduler.isNative) {
        window.nativeAlarmScheduler.requestBatteryExemption();
      } else {
        alert('لحماية المنبه من إغلاق النظام بعد غلق التطبيق:\n\n1. ادخل على إعدادات الهاتف\n2. اختر التطبيقات -> كابتن المشاوير\n3. ادخل على البطارية واختر: "بلا قيود" (No restrictions)\n4. فعّل التشغيل التلقائي (Auto-start).');
      }
    });
  }

  /* ================== 7. MANUAL ADD MODAL ================== */
  const openModal = () => {
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('manualTime').value = '12:00';
    if (modalLayer) modalLayer.classList.add('active');
  };

  if (btnOpenManual) btnOpenManual.addEventListener('click', openModal);
  if (btnQuickAddTrip) btnQuickAddTrip.addEventListener('click', openModal);

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (modalLayer) modalLayer.classList.remove('active');
    });
  }

  if (modalLayer) {
    modalLayer.addEventListener('click', (e) => {
      if (e.target === modalLayer) modalLayer.classList.remove('active');
    });
  }

  if (cleanManualForm) {
    cleanManualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('manualName').value.trim() || 'عميل خاص';
      const phone = document.getElementById('manualPhone').value.trim();
      const type = document.getElementById('manualType').value;
      const date = document.getElementById('manualDate').value;
      const time = document.getElementById('manualTime').value;
      const priceVal = parseInt(document.getElementById('manualPrice').value, 10);

      const typeMeta = {
        airport: { label: 'مشوار مطار' },
        travel: { label: 'سفر محافظات' },
        school: { label: 'توصيلة مدرسة' },
        general: { label: 'مشوار خاص' }
      }[type] || { label: 'مشوار خاص' };

      const [hh, mm] = time.split(':');
      const hour24 = parseInt(hh, 10);
      const minutes = parseInt(mm, 10);

      const newTrip = {
        id: 'trip_' + Date.now(),
        raw: '',
        clientName: name,
        clientPhone: window.captainStorage.normalizePhone(phone),
        type: type,
        typeLabel: typeMeta.label,
        date: date,
        dateDisplay: date,
        time: time,
        timeDisplay: time,
        hour24: hour24,
        minutes: minutes,
        price: isNaN(priceVal) ? null : priceVal,
        status: 'upcoming',
        createdAt: new Date().toISOString()
      };

      window.captainStorage.addTrip(newTrip);
      if (window.nativeAlarmScheduler) {
        await window.nativeAlarmScheduler.scheduleAlarm(newTrip);
      }
      if (window.soundEffects) window.soundEffects.playSuccessChime();

      if (modalLayer) modalLayer.classList.remove('active');
      cleanManualForm.reset();
      showToast('تم حفظ المشوار وضبط المنبه');
      renderTrips();
    });
  }

  /* ================== 8. TOAST NOTIFICATION ================== */
  let toastTimer = null;
  function showToast(msg) {
    if (!toastBar || !toastText) return;
    toastText.textContent = msg;
    toastBar.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastBar.classList.remove('show');
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Restore and re-register exact alarms for upcoming trips
  function restoreAlarmsOnStartup() {
    const trips = window.captainStorage.getTrips();
    const now = Date.now();
    trips.forEach(trip => {
      if (trip.status !== 'completed' && window.nativeAlarmScheduler) {
        const triggerMillis = window.nativeAlarmScheduler.calculateTimestampMillis(trip.date, trip.hour24, trip.minutes);
        if (triggerMillis > now) {
          window.nativeAlarmScheduler.scheduleAlarm(trip);
        }
      }
    });
  }

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Initial render & alarm restoration
  renderTrips();
  restoreAlarmsOnStartup();
});
