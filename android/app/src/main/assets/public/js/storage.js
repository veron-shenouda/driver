/**
 * Zero-Bloat Robust Local & Native Storage Manager
 * State safety: Dual persistence (LocalStorage + Native Android SharedPreferences Backup)
 * Client contacts memory, phone normalizer, and auto-recovery on restart.
 */

class CaptainStorage {
  constructor() {
    this.TRIPS_KEY = 'captain_trips_clean_v2';
    this.CLIENTS_KEY = 'captain_clients_clean_v2';

    // Synchronize and restore backup if LocalStorage was cleared
    this.ensureStateRecovery();
  }

  ensureStateRecovery() {
    try {
      const localTrips = this.getLocalTrips();
      if ((!localTrips || localTrips.length === 0) && window.AndroidNativeAlarm && window.AndroidNativeAlarm.loadTripsBackup) {
        const backupRaw = window.AndroidNativeAlarm.loadTripsBackup();
        if (backupRaw && backupRaw.length > 2) {
          const parsed = JSON.parse(backupRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(this.TRIPS_KEY, backupRaw);
            console.log('Restored trips from Native SharedPreferences backup:', parsed.length);
          }
        }
      }
    } catch (e) {
      console.warn('State recovery check error:', e);
    }
  }

  /* ================== TRIPS ================== */

  getLocalTrips() {
    try {
      const raw = localStorage.getItem(this.TRIPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  getTrips() {
    let trips = this.getLocalTrips();
    // If empty in LocalStorage, attempt native fallback
    if ((!trips || trips.length === 0) && window.AndroidNativeAlarm && window.AndroidNativeAlarm.loadTripsBackup) {
      try {
        const nativeRaw = window.AndroidNativeAlarm.loadTripsBackup();
        if (nativeRaw && nativeRaw.length > 2) {
          trips = JSON.parse(nativeRaw);
          localStorage.setItem(this.TRIPS_KEY, nativeRaw);
        }
      } catch (e) {}
    }
    return trips || [];
  }

  saveTrips(trips) {
    const jsonStr = JSON.stringify(trips);
    try {
      localStorage.setItem(this.TRIPS_KEY, jsonStr);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    // Native SharedPreferences Backup
    if (window.AndroidNativeAlarm && window.AndroidNativeAlarm.saveTripsBackup) {
      try {
        window.AndroidNativeAlarm.saveTripsBackup(jsonStr);
      } catch (e) {
        console.warn('Native SharedPreferences backup error:', e);
      }
    }
  }

  addTrip(trip) {
    const trips = this.getTrips();
    trips.unshift(trip);
    this.saveTrips(trips);

    // Auto-cache client name with phone number if available
    if (trip.clientName && trip.clientPhone) {
      this.saveClientContact(trip.clientName, trip.clientPhone);
    }
    return trip;
  }

  deleteTrip(id) {
    const trips = this.getTrips();
    const filtered = trips.filter(t => t.id !== id);
    this.saveTrips(filtered);
    return true;
  }

  completeTrip(id) {
    const trips = this.getTrips();
    const idx = trips.findIndex(t => t.id === id);
    if (idx !== -1) {
      trips[idx].status = 'completed';
      this.saveTrips(trips);
      return trips[idx];
    }
    return null;
  }

  updateTripPhone(id, phone) {
    const cleanPhone = this.normalizePhone(phone);
    const trips = this.getTrips();
    const idx = trips.findIndex(t => t.id === id);
    if (idx !== -1) {
      trips[idx].clientPhone = cleanPhone;
      this.saveTrips(trips);
      if (trips[idx].clientName) {
        this.saveClientContact(trips[idx].clientName, cleanPhone);
      }
      return trips[idx];
    }
    return null;
  }

  /* ================== CONTACTS CACHE ================== */

  getCachedClients() {
    try {
      const raw = localStorage.getItem(this.CLIENTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  saveClientContact(name, phone) {
    const cleanName = this.normalizeName(name);
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanName || !cleanPhone) return;

    const clients = this.getCachedClients();
    clients[cleanName] = cleanPhone;
    localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
  }

  findPhoneByName(name) {
    const cleanSearch = this.normalizeName(name);
    if (!cleanSearch) return '';

    const clients = this.getCachedClients();
    if (clients[cleanSearch]) {
      return clients[cleanSearch];
    }

    // Fuzzy check
    for (const [savedName, phone] of Object.entries(clients)) {
      if (savedName.includes(cleanSearch) || cleanSearch.includes(savedName)) {
        return phone;
      }
    }
    return '';
  }

  normalizeName(str) {
    if (!str) return '';
    return str
      .replace(/(أستاذة?|استاذة?|مدام|باشا|الباشا|دكتور|دكتورة|مهندس|حاج|عم|كابتن|مع|لـ|ل)/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, '')
      .trim();
  }

  normalizePhone(phone) {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');

    // Strip Egyptian country code 0020 or +20
    if (clean.startsWith('0020')) {
      clean = clean.substring(4);
    } else if (clean.startsWith('20') && clean.length > 10) {
      clean = clean.substring(2);
    }

    // Ensure leading 0 for Egyptian mobile (010, 011, 012, 015)
    if (clean.length === 10 && clean.startsWith('1')) {
      clean = '0' + clean;
    }

    return clean;
  }
}

window.captainStorage = new CaptainStorage();
