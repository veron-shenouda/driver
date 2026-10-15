/**
 * Production-Ready Application Controller (Zero Bloat)
 * Live Arabic Clock, Native Android Alarm, Instant Contact Import, Test Alarm Trigger
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tripsContainer = document.getElementById('tripsContainer');
  const voiceFabTouch = document.getElementById('voiceFabTouch');
  const toastBar = document.getElementById('toastBar');
  const toastText = document.getElementById('toastText');
  const btnBatteryFix = document.getElementById('btnBatteryFix');
  const btnTestAlarm = document.getElementById('btnTestAlarm');
  const btnImportContact = document.getElementById('btnImportContact');

  // Live Clock Elements
  const liveClockTime = document.getElementById('liveClockTime');
  const liveClockPeriod = document.getElementById('liveClockPeriod');
  const liveClockDate = document.getElementById('liveClockDate');

  // Modal
  const modalLayer = document.getElementById('modalLayer');
  const btnOpenManual = document.getElementById('btnOpenManual');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const cleanManualForm = document.getElementById('cleanManualForm');

  /* ================== 1. LIVE REAL-TIME CLOCK (ar-EG) ================== */
  function updateLiveClock() {
    const now = new Date();

    // 12-Hour format components
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const isPm = hours >= 12;
    const periodArabic = isPm ? 'مساءً' : 'صباحاً';

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
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      liveClockDate.textContent = now.toLocaleDateString('ar-EG', options);
    }
  }

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  /* ================== 2. TEST ALARM BUTTON (Instant Verification) ================== */
  if (btnTestAlarm) {
    btnTestAlarm.addEventListener('click', () => {
      showToast('جاري تشغيل تجربة منبه كابتن المشاوير بأعلى صوت! 🔔');
      if (window.nativeAlarmScheduler) {
        window.nativeAlarmScheduler.testAlarmSound(() => {
          showToast('تم إيقاف صوت التنبيه بنجاح');
        });
      }
    });
  }

  /* ================== 3. ZERO-CLICK VOICE SCHEDULER ================== */
  const voiceScheduler = new window.VoiceScheduler({
    onTripCreated: async (savedTrip) => {
      showToast(`تم حفظ مشوار: ${savedTrip.clientName} ⚡`);
      if (window.nativeAlarmScheduler) {
        await window.nativeAlarmScheduler.scheduleAlarm(savedTrip);
      }
      renderTrips();
    },
    onStateChange: (state) => {
      if (state === 'listening') {
        voiceFabTouch.classList.add('listening');
        voiceFabTouch.innerHTML = '<span>🔴</span> <span>جاري الاستماع... اتكلم يا كابتن</span>';
      } else {
        voiceFabTouch.classList.remove('listening');
        voiceFabTouch.innerHTML = '<span>🎙️</span> <span>تحدث لتسجيل مشوار فوري ⚡</span>';
      }
    },
    onError: (err) => {
      showToast(err);
    }
  });

  voiceFabTouch.addEventListener('click', () => {
    if (window.soundEffects) window.soundEffects.init();
    voiceScheduler.startListening();
  });

  /* ================== 4. TRIPS RENDERING & NATIVE ALARM ================== */
  function renderTrips() {
    const trips = window.captainStorage.getTrips();
    if (!tripsContainer) return;

    if (trips.length === 0) {
      tripsContainer.innerHTML = `
        <div class="empty-box">
          <div class="empty-icon">🚕</div>
          <div class="empty-title">لا توجد مشاوير مسجلة اليوم</div>
          <div class="empty-sub">اضغط على زر المايك الأزرق بالأسفل وتكلم لتسجيل أي مشوار فوراً.</div>
        </div>
      `;
      return;
    }

    tripsContainer.innerHTML = trips.map(trip => {
      const alarmIntentUri = window.nativeAlarmScheduler
        ? window.nativeAlarmScheduler.getAndroidClockIntentUri(trip)
        : '#';

      const isCompleted = trip.status === 'completed';

      return `
        <div class="trip-card ${isCompleted ? 'completed' : ''}" data-id="${trip.id}">
          <div class="card-header-row">
            <span class="category-tag ${trip.type}">
              ${trip.typeIcon} ${trip.typeLabel}
            </span>
            <span class="card-price">${trip.price ? trip.price + ' ج.م' : '---'}</span>
          </div>

          <div class="card-client-name">
            👤 ${escapeHtml(trip.clientName)}
          </div>
          ${trip.clientPhone ? `<div class="card-client-phone">📞 ${trip.clientPhone}</div>` : ''}

          <div class="card-timing-box">
            <div class="timing-row date">
              <span>📅</span> <span>${escapeHtml(trip.dateDisplay || trip.date)}</span>
            </div>
            <div class="timing-row time">
              <span>⏰</span> <span>${escapeHtml(trip.timeDisplay || trip.time)}</span>
            </div>
          </div>

          <div class="card-actions-col">
            <!-- DIRECT NATIVE ALARM ANCHOR (Direct Clock App / AlarmManager launch) -->
            <a href="${alarmIntentUri}" class="btn-alarm-anchor btn-action-alarm" data-id="${trip.id}">
              <span>⏰</span> <span>ضبط منبه</span>
            </a>

            <!-- Subrow: Direct Call, WhatsApp, Complete -->
            <div class="btn-subrow">
              <button class="btn-tactile call btn-card-call" data-id="${trip.id}">
                <span>📞</span> <span>اتصال</span>
              </button>

              <button class="btn-tactile wa btn-card-wa" data-id="${trip.id}">
                <span>💬</span> <span>واتساب</span>
              </button>

              ${!isCompleted ? `
                <button class="btn-tactile complete btn-card-complete" data-id="${trip.id}">
                  <span>✅</span> <span>تم</span>
                </button>
              ` : `
                <button class="btn-tactile delete btn-card-delete" data-id="${trip.id}">
                  <span>🗑️</span> <span>حذف</span>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    attachTripEvents();
  }

  function attachTripEvents() {
    // Alarm click: schedule via Native AlarmManager if in native APK
    document.querySelectorAll('.btn-action-alarm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (trip && window.nativeAlarmScheduler && window.nativeAlarmScheduler.isNative) {
          e.preventDefault();
          window.nativeAlarmScheduler.scheduleAlarm(trip);
          if (window.soundEffects) window.soundEffects.playSuccessChime();
          showToast('تم ضبط منبه النظام الصارم بنجاح! ⏰');
        }
      });
    });

    // Direct Call
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

    // Direct WhatsApp
    document.querySelectorAll('.btn-card-wa').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        const trip = window.captainStorage.getTrips().find(t => t.id === tripId);
        if (!trip) return;

        if (trip.clientPhone) {
          let cleanPhone = trip.clientPhone.replace(/[^0-9]/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = '20' + cleanPhone.substring(1);
          const msg = encodeURIComponent(`السلام عليكم يا فندم، أنا الكابتن بخصوص مشوار حضرتك يوم ${trip.dateDisplay || 'المحدد'}.`);
          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
        } else {
          promptAndSetPhone(trip);
        }
      });
    });

    // Mark Complete
    document.querySelectorAll('.btn-card-complete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tripId = btn.getAttribute('data-id');
        window.captainStorage.completeTrip(tripId);
        if (window.nativeAlarmScheduler) {
          window.nativeAlarmScheduler.cancelAlarm(tripId);
        }
        if (window.soundEffects) window.soundEffects.playSuccessChime();
        showToast('تم إنهاء المشوار بنجاح 👏');
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
      showToast('تم حفظ الرقم وربطه بالعميل!');
      renderTrips();
    }
  }

  /* ================== 5. INSTANT CONTACT IMPORT ================== */
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

              showToast(`تم سحب رقم: ${cleanName} (${cleanPhone}) 📞`);
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
        alert('لتشغيل المنبه بعد قفل التطبيق أو إعادة تشغيل الهاتف:\n\n1. ادخل على إعدادات الهاتف (Settings)\n2. اختر التطبيقات (Apps) -> كابتن المشاوير\n3. ادخل على البطارية (Battery) واختر: "بلا قيود" (No restrictions / Unrestricted)\n4. فعّل التشغيل التلقائي (Auto-start) في هواتف شاومي وسامسونج.');
      }
    });
  }

  /* ================== 7. MANUAL ADD MODAL ================== */
  btnOpenManual.addEventListener('click', () => {
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('manualTime').value = '12:00';
    modalLayer.classList.add('active');
  });

  btnCloseModal.addEventListener('click', () => {
    modalLayer.classList.remove('active');
  });

  modalLayer.addEventListener('click', (e) => {
    if (e.target === modalLayer) modalLayer.classList.remove('active');
  });

  cleanManualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('manualName').value.trim() || 'عميل خاص';
    const phone = document.getElementById('manualPhone').value.trim();
    const type = document.getElementById('manualType').value;
    const date = document.getElementById('manualDate').value;
    const time = document.getElementById('manualTime').value;
    const priceVal = parseInt(document.getElementById('manualPrice').value, 10);

    const typeMeta = {
      airport: { label: 'مشوار مطار', icon: '✈️' },
      travel: { label: 'سفر محافظات', icon: '🛣️' },
      school: { label: 'توصيلة مدرسة', icon: '🎒' },
      general: { label: 'مشوار خاص VIP', icon: '🚗' }
    }[type] || { label: 'مشوار خاص', icon: '🚗' };

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
      typeIcon: typeMeta.icon,
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

    modalLayer.classList.remove('active');
    cleanManualForm.reset();
    showToast('تم حفظ المشوار وضبط المنبه ⚡');
    renderTrips();
  });

  /* ================== TOAST ================== */
  let toastTimer = null;
  function showToast(msg) {
    if (!toastBar || !toastText) return;
    toastText.textContent = msg;
    toastBar.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastBar.classList.remove('show');
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Initial render
  renderTrips();
});
