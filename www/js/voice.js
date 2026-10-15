/**
 * ZERO-CLICK AI VOICE SCHEDULER (الصوت الذكي التلقائي الفوري)
 * Web Speech API configured for ar-EG (Egyptian Arabic)
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
      console.warn('Web Speech API is not supported in this browser.');
      this.hasSupport = false;
      return;
    }

    this.hasSupport = true;
    try {
      this.recognition = new SpeechRecognition();
      // Strict Egyptian Arabic
      this.recognition.lang = 'ar-EG';
      this.recognition.continuous = false; // Stop immediately upon silence
      this.recognition.interimResults = false; // Wait for final confident result
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange('listening', 'جاري الاستماع... اتكلم يا كابتن 🎙️');
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
          userMsg = '⚠️ تم رفض إذن الميكروفون. برجاء السماح بالمايك من إعدادات المتصفح.';
        } else if (event.error === 'no-speech') {
          userMsg = 'لم يتم سماع أي صوت، اضغط وجرب تاني يا كابتن.';
        } else if (event.error === 'network') {
          userMsg = 'تحقق من اتصال الإنترنت لخدمة الصوت أو استخدم الإدخال السريع.';
        }

        if (window.soundEffects) {
          window.soundEffects.playAlert();
        }

        this.onStateChange('error', userMsg);
        this.onError(userMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // If state is not already 'committed', set to idle
        this.onStateChange('idle', 'اضغط وتحدث لتسجيل مشوار فوري ⚡');
      };
    } catch (e) {
      console.error('Failed to initialize SpeechRecognition:', e);
      this.hasSupport = false;
    }
  }

  /**
   * Start Voice Listening
   */
  startListening() {
    if (!this.hasSupport || !this.recognition) {
      this.onError('خاصية الصوت غير مدعومة في هذا المتصفح، يمكنك استخدام زر المشوار السريع.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Speech start warning:', e);
      // If already started, try aborting then starting
      try {
        this.recognition.abort();
        setTimeout(() => this.recognition.start(), 150);
      } catch (err) {
        this.onError('تعذر تشغيل الميكروفون حالياً، جرب مرة أخرى.');
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
      this.isListening = false;
    }
  }

  /**
   * CORE ZERO-CLICK COMMIT PIPELINE:
   * 1. Parse sentence via Egyptian Arabic NLP engine
   * 2. Immediately persist to localStorage database
   * 3. Play luxury success chime
   * 4. Prepend to schedule UI instantly
   */
  processZeroClickCommit(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return;
    }

    this.onStateChange('processing', 'جاري الحفظ الفوري تلقائياً... ⚡');

    // 1. NLP Parse
    const parsedTrip = this.parser.parse(transcript);

    // 2. Database Write (localStorage)
    const savedTrip = window.captainStorage.addTrip(parsedTrip);

    // 3. Audio Chime (Audible Pleasant Feedback)
    if (window.soundEffects) {
      window.soundEffects.playSuccessChime();
    }

    // 4. Update UI State & Trigger Callback
    this.onStateChange('committed', `تم حفظ المشوار فوراً: ${savedTrip.clientName} (${savedTrip.typeLabel})`);
    this.onTripCreated(savedTrip, transcript);

    // Reset indicator after 3 seconds
    setTimeout(() => {
      if (!this.isListening) {
        this.onStateChange('idle', 'اضغط وتحدث لتسجيل مشوار فوري ⚡');
      }
    }, 3200);
  }

  handleEmptySpeech() {
    this.isListening = false;
    this.onStateChange('idle', 'لم يتم التعرف على كلمات، اضغط وجرب تاني.');
  }

  /**
   * Fast Emulator / Preset Egyptian Voice Tester
   * Allows the driver or reviewer to test real Egyptian sentences with 1 click
   */
  simulateVoiceSentence(sampleSentence) {
    this.onStateChange('listening', `محاكاة صوت: "${sampleSentence}"`);
    setTimeout(() => {
      this.processZeroClickCommit(sampleSentence);
    }, 400);
  }
}

window.VoiceScheduler = VoiceScheduler;
