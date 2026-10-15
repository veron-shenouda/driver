/**
 * ZERO-CLICK AI VOICE SCHEDULER (الصوت الذكي التلقائي الفوري)
 * Web Speech API configured for ar-EG (Egyptian Arabic) with explicit Audio Permission Handling
 * Immediately commits trip to storage and schedule on voice completion without user intervention.
 */

class VoiceScheduler {
  constructor(options = {}) {
    this.onTripCreated = options.onTripCreated || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onError = options.onError || (() => {});

    this.parser = new window.EgyptianTripParser(window.captainStorage);
    this.recognition = null;
    this.isListening = false;
    this.hasSupport = false;

    this.initSpeechEngine();
  }

  initSpeechEngine() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not natively supported in this webview instance.');
      this.hasSupport = false;
      return;
    }

    this.hasSupport = true;
    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ar-EG';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange('listening', 'جارٍ الاستماع... اتكلم يا كابتن');
        if (window.soundEffects) {
          window.soundEffects.playListeningStart();
        }
      };

      this.recognition.onresult = (event) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) {
          this.handleEmptySpeech();
          return;
        }

        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        console.log('Voice recognized (ar-EG):', transcript, 'Confidence:', confidence);

        this.processZeroClickCommit(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;

        let userMsg = 'حدث خطأ في استقبال الصوت';
        if (event.error === 'not-allowed') {
          userMsg = '⚠️ تم رفض إذن الميكروفون. برجاء السماح بصلاحية الصوت في التطبيق.';
          this.requestPermissions();
        } else if (event.error === 'no-speech') {
          userMsg = 'لم يتم سماع أي صوت، اضغط وتكلم يا كابتن.';
        } else if (event.error === 'network') {
          userMsg = 'تحقق من اتصال الإنترنت لخدمة تحويل الصوت لكلام.';
        }

        if (window.soundEffects) {
          window.soundEffects.playAlert();
        }

        this.onStateChange('error', userMsg);
        this.onError(userMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange('idle', 'اضغط للتحدث لتسجيل مشوار فوري ⚡');
      };
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition:', e);
      this.hasSupport = false;
    }
  }

  /**
   * Proactively request audio recording permissions from Android & Browser
   */
  async requestPermissions() {
    // 1. Native Android Permission check & request
    if (window.AndroidNativeAlarm && window.AndroidNativeAlarm.requestAudioPermission) {
      try {
        window.AndroidNativeAlarm.requestAudioPermission();
      } catch (e) {}
    }

    // 2. Web MediaDevices permission trigger
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close stream immediately once permission is verified/granted
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (err) {
        console.warn('getUserMedia audio permission prompt result:', err);
      }
    }
    return false;
  }

  /**
   * Start Voice Listening
   */
  async startListening() {
    // Check & request permission first
    await this.requestPermissions();

    if (!this.hasSupport || !this.recognition) {
      // Prompt driver for quick Egyptian voice dictation
      this.fallbackVoiceInputPrompt();
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Speech start error, aborting and retrying:', e);
      try {
        this.recognition.abort();
        setTimeout(() => this.recognition.start(), 200);
      } catch (err) {
        this.fallbackVoiceInputPrompt();
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  /**
   * Fallback for devices where Webview Web Speech is disabled:
   * Uses simple dictation popup where keyboard's native mic works 100%
   */
  fallbackVoiceInputPrompt() {
    const spoken = prompt('اكتب أو اضغط على مايك الكيبورد وتحدث بالمشوار (مثال: مشوار لأحمد بكرة الساعة 5 مساءً بـ 250):');
    if (spoken && spoken.trim()) {
      this.processZeroClickCommit(spoken.trim());
    }
  }

  /**
   * CORE ZERO-CLICK COMMIT PIPELINE:
   * 1. Parse sentence via Egyptian Arabic NLP engine
   * 2. Immediately persist to localStorage & Native SharedPreferences
   * 3. Play pleasant success chime
   * 4. Prepend to schedule UI instantly & trigger exact native alarm
   */
  processZeroClickCommit(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return;
    }

    this.onStateChange('processing', 'جارٍ الفهم والحفظ التلقائي...');

    // 1. NLP Parse
    const parsedTrip = this.parser.parse(transcript);

    // 2. Database Write (localStorage + Native SharedPreferences)
    const savedTrip = window.captainStorage.addTrip(parsedTrip);

    // 3. Audio Chime (Audible Pleasant Feedback)
    if (window.soundEffects) {
      window.soundEffects.playSuccessChime();
    }

    // 4. Update UI State & Trigger Callback
    this.onStateChange('committed', `تم حفظ المشوار: ${savedTrip.clientName}`);
    this.onTripCreated(savedTrip, transcript);

    // Reset indicator after 3 seconds
    setTimeout(() => {
      if (!this.isListening) {
        this.onStateChange('idle', 'اضغط وتحدث لتسجيل مشوار فوري');
      }
    }, 3200);
  }

  handleEmptySpeech() {
    this.isListening = false;
    this.onStateChange('idle', 'لم يتم التعرف على كلمات، اضغط وجرب تاني يا كابتن.');
  }

  /**
   * Test simulated sentence directly
   */
  simulateVoiceSentence(sampleSentence) {
    this.onStateChange('listening', `محاكاة صوت: "${sampleSentence}"`);
    setTimeout(() => {
      this.processZeroClickCommit(sampleSentence);
    }, 400);
  }
}

window.VoiceScheduler = VoiceScheduler;
