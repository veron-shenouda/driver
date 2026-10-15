/**
 * Zero-Bloat Local Storage Manager
 * Clean slate: trip records, client contacts memory, and phone normalizer.
 */

class CaptainStorage {
  constructor() {
    this.TRIPS_KEY = 'captain_trips_clean_v2';
    this.CLIENTS_KEY = 'captain_clients_clean_v2';
  }

  /* ================== TRIPS ================== */

  getTrips() {
    try {
      const raw = localStorage.getItem(this.TRIPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveTrips(trips) {
    localStorage.setItem(this.TRIPS_KEY, JSON.stringify(trips));
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
