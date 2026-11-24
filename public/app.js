(() => {
  'use strict';

  // ==========================================================================
  // Preloaded Demo Data (Datos de demostración)
  // ==========================================================================
  const EXAMPLES = {
    mensaje_sospechoso: [
      {
        label: 'Familiar en apuros (Carmen)',
        text: 'Hola abuela, cambié de número. Estoy en apuros, necesito S/ 200 urgente, no le digas a mamá.',
      },
      {
        label: 'Banco / Código SMS',
        text: 'Banco Horizonte: para evitar el bloqueo de su cuenta, envíenos el código de verificación que le llegó por SMS.',
      },
      {
        label: 'Mensaje ambiguo',
        text: 'Su pedido está retenido. Confirme su dirección para reprogramar la entrega.',
      },
    ],
    oferta_trabajo: [
      {
        label: 'Oferta con cobro anticipado (Jhon)',
        text: 'Gana S/ 3,500 al mes desde casa. Reserva tu puesto pagando S/ 80 de capacitación hoy.',
      },
    ],
  };

  // ==========================================================================
  // State
  // ==========================================================================
  const state = {
    route: '/',
    verifierType: 'mensaje_sospechoso',
    lastResult: null,
    soundEnabled: false,
    spokenChargeId: null,
    currentCharge: null,
    pollTimer: null,
    simLastSyncedId: null,
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const views = {
    '/': document.getElementById('view-home'),
    '/verificador': document.getElementById('view-verifier'),
    '/cobro': document.getElementById('view-payment'),
    '/simulador': document.getElementById('view-simulator'),
  };

  const navButtons = {
    '/': document.getElementById('nav-home'),
    '/verificador': document.getElementById('nav-verifier'),
    '/cobro': document.getElementById('nav-payment'),
    '/simulador': document.getElementById('nav-simulator'),
  };

  // Verifier DOM
  const tabMensaje = document.getElementById('tab-mensaje');
  const tabOferta = document.getElementById('tab-oferta');
  const exampleChipsEl = document.getElementById('example-chips');
  const verifierTextarea = document.getElementById('verifier-textarea');
  const verifierValidationMsg = document.getElementById('verifier-validation-msg');
  const btnClearText = document.getElementById('btn-clear-text');
  const btnAnalyze = document.getElementById('btn-analyze');
  const resultIdle = document.getElementById('result-idle');
  const resultLoading = document.getElementById('result-loading');
  const resultOutput = document.getElementById('result-output');
  const resultBadge = document.getElementById('result-badge');
  const resultSignal = document.getElementById('result-signal');
  const resultAction = document.getElementById('result-action');
  const btnListenResult = document.getElementById('btn-listen-result');
  const speechErrorVerifier = document.getElementById('speech-error-verifier');

  // Payment DOM (Luis)
  const paymentStatusBadge = document.getElementById('payment-status-badge');
  const paymentAmountEl = document.getElementById('payment-amount');
  const paymentIdEl = document.getElementById('payment-id');
  const paymentBanner = document.getElementById('payment-status-banner');
  const paymentBannerTitle = document.getElementById('payment-banner-title');
  const paymentBannerDesc = document.getElementById('payment-banner-desc');
  const paymentMismatchAlert = document.getElementById('payment-mismatch-alert');
  const paymentMismatchDetail = document.getElementById('payment-mismatch-detail');
  const paymentSpeechAlert = document.getElementById('payment-speech-alert');
  const paymentSpeechMsg = document.getElementById('payment-speech-msg');
  const btnReplayPaymentVoice = document.getElementById('btn-replay-payment-voice');
  const btnEnableSound = document.getElementById('btn-enable-sound');
  const btnResetCharge = document.getElementById('btn-reset-charge');
  const phoneExpectedId = document.getElementById('phone-expected-id');
  const luisPhoneWaiting = document.getElementById('luis-phone-waiting');
  const luisPhoneConfirmed = document.getElementById('luis-phone-confirmed');
  const luisPhoneConfirmedDetail = document.getElementById('luis-phone-confirmed-detail');
  const luisPhoneMismatch = document.getElementById('luis-phone-mismatch');
  const luisPhoneMismatchDetail = document.getElementById('luis-phone-mismatch-detail');

  // Simulator DOM
  const simActiveId = document.getElementById('sim-active-id');
  const simActiveAmount = document.getElementById('sim-active-amount');
  const simActiveStatus = document.getElementById('sim-active-status');
  const simInputId = document.getElementById('sim-input-id');
  const simInputAmount = document.getElementById('sim-input-amount');
  const btnSimConfirm = document.getElementById('btn-sim-confirm');
  const btnSimWrongAmount = document.getElementById('btn-sim-wrong-amount');
  const btnSimWrongId = document.getElementById('btn-sim-wrong-id');
  const btnSimSync = document.getElementById('btn-sim-sync');
  const simFeedback = document.getElementById('sim-feedback');
  const btnToggleFakeReceipt = document.getElementById('btn-toggle-fake-receipt');
  const fakeReceiptCard = document.getElementById('fake-receipt-card');

  // ==========================================================================
  // Speech Synthesis Helper (Device Voice)
  // ==========================================================================
  function getSpanishVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase() === 'es-pe') ||
      voices.find((v) => v.lang && v.lang.toLowerCase() === 'es-419') ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('es')) ||
      null
    );
  }

  function speakText(text, onError) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
      if (onError) onError('Tu navegador no soporta lectura en voz alta. Lee las indicaciones en pantalla.');
      return false;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-PE';
      utterance.rate = 0.96;
      utterance.pitch = 1.0;

      const voice = getSpanishVoice();
      if (voice) utterance.voice = voice;

      utterance.onerror = () => {
        if (onError) {
          onError('No se pudo reproducir la voz en este dispositivo. El estado sigue visible en pantalla.');
        }
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      if (onError) {
        onError('No se pudo activar la voz del dispositivo. El estado sigue visible en pantalla.');
      }
      return false;
    }
  }

  // Preload voices on browsers that load them asynchronously
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      getSpanishVoice();
    };
  }

  // ==========================================================================
  // SPA Router
  // ==========================================================================
  function normalizeRoute(pathname) {
    if (pathname === '/verificador' || pathname === '/cobro' || pathname === '/simulador') {
      return pathname;
    }
    return '/';
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function navigate(route, options = {}) {
    const target = normalizeRoute(route);
    state.route = target;

    if (!options.fromPopState && window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }

    Object.entries(views).forEach(([key, el]) => {
      const isCurrent = key === target;
      el.hidden = !isCurrent;
      el.classList.toggle('active', isCurrent);
    });

    Object.entries(navButtons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === target);
    });

    stopPolling();

    if (target === '/cobro') {
      fetchCurrentChargeForLuis();
      state.pollTimer = setInterval(fetchCurrentChargeForLuis, 1500);
    } else if (target === '/simulador') {
      fetchCurrentChargeForSimulator(true);
      state.pollTimer = setInterval(() => fetchCurrentChargeForSimulator(false), 2000);
    }

    if (!options.keepScroll) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  window.addEventListener('popstate', () => {
    navigate(window.location.pathname, { fromPopState: true });
  });

  // Bind navigation links & back buttons
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.getAttribute('data-route'));
    });
  });

  // Header "Modo demo" button scrolls to the simulated phone on Home
  document.getElementById('btn-header-demo').addEventListener('click', () => {
    navigate('/', { keepScroll: true });
    setTimeout(() => {
      const phoneSection = document.getElementById('demo-phone-section');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  });

  // ==========================================================================
  // Home Choices & F3 Modo Demo Notifications
  // ==========================================================================
  function openVerifier(type, prefillText = '') {
    setVerifierType(type);
    if (prefillText) {
      verifierTextarea.value = prefillText;
      verifierValidationMsg.textContent = '';
    }
    resetResultPanel();
    navigate('/verificador');
  }

  document.getElementById('btn-choice-message').addEventListener('click', () => {
    openVerifier('mensaje_sospechoso');
  });

  document.getElementById('btn-choice-payment').addEventListener('click', () => {
    navigate('/cobro');
  });

  document.getElementById('btn-choice-job').addEventListener('click', () => {
    openVerifier('oferta_trabajo');
  });

  // Simulated phone notifications (F3)
  document.getElementById('demo-notif-carmen').addEventListener('click', () => {
    openVerifier('mensaje_sospechoso', EXAMPLES.mensaje_sospechoso[0].text);
  });

  document.getElementById('demo-notif-luis').addEventListener('click', () => {
    navigate('/cobro');
  });

  document.getElementById('demo-notif-jhon').addEventListener('click', () => {
    openVerifier('oferta_trabajo', EXAMPLES.oferta_trabajo[0].text);
  });

  // ==========================================================================
  // F1: Verificador con IA
  // ==========================================================================
  function renderExampleChips() {
    const items = EXAMPLES[state.verifierType] || [];
    exampleChipsEl.innerHTML = '';
    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'example-chip';
      btn.id = `example-chip-${state.verifierType}-${idx}`;
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        verifierTextarea.value = item.text;
        verifierValidationMsg.textContent = '';
        verifierTextarea.focus();
      });
      exampleChipsEl.appendChild(btn);
    });
  }

  function setVerifierType(type) {
    state.verifierType = type === 'oferta_trabajo' ? 'oferta_trabajo' : 'mensaje_sospechoso';
    const isMsg = state.verifierType === 'mensaje_sospechoso';

    tabMensaje.classList.toggle('active', isMsg);
    tabMensaje.setAttribute('aria-selected', String(isMsg));

    tabOferta.classList.toggle('active', !isMsg);
    tabOferta.setAttribute('aria-selected', String(!isMsg));

    btnAnalyze.textContent = isMsg ? 'Analizar mensaje' : 'Analizar oferta de trabajo';
    renderExampleChips();
  }

  tabMensaje.addEventListener('click', () => setVerifierType('mensaje_sospechoso'));
  tabOferta.addEventListener('click', () => setVerifierType('oferta_trabajo'));

  btnClearText.addEventListener('click', () => {
    verifierTextarea.value = '';
    verifierValidationMsg.textContent = '';
    verifierTextarea.focus();
  });

  function resetResultPanel() {
    state.lastResult = null;
    resultIdle.hidden = false;
    resultLoading.hidden = true;
    resultOutput.hidden = true;
    speechErrorVerifier.hidden = true;
    speechErrorVerifier.textContent = '';
  }

  function renderVerifierResult(data) {
    state.lastResult = data;
    resultIdle.hidden = true;
    resultLoading.hidden = true;
    resultOutput.hidden = false;
    speechErrorVerifier.hidden = true;
    speechErrorVerifier.textContent = '';

    // Reset card and badge classes
    resultOutput.className = 'result-card';
    resultBadge.className = 'status-badge';

    const estado = data.estado || 'Análisis no disponible';

    if (estado === 'Alto riesgo') {
      resultOutput.classList.add('result-card--danger');
      resultBadge.classList.add('status-badge--danger');
      resultBadge.textContent = '🛑 Alto riesgo';
    } else if (estado === 'Señales de riesgo') {
      resultOutput.classList.add('result-card--warn');
      resultBadge.classList.add('status-badge--warn');
      resultBadge.textContent = '⚠️ Señales de riesgo';
    } else if (estado === 'No se pudo verificar') {
      resultOutput.classList.add('result-card--neutral');
      resultBadge.classList.add('status-badge--neutral');
      resultBadge.textContent = '🔎 No se pudo verificar';
    } else {
      resultOutput.classList.add('result-card--neutral');
      resultBadge.classList.add('status-badge--warn');
      resultBadge.textContent = 'ℹ️ Análisis no disponible';
    }

    resultSignal.textContent = data.senal || 'No se pudo completar el análisis en este momento.';
    resultAction.textContent =
      data.accion ||
      'No pagues ni compartas códigos. Verifica siempre por una vía oficial o llama al número que ya tienes guardado.';
  }

  btnAnalyze.addEventListener('click', async () => {
    const text = verifierTextarea.value.trim();
    if (!text) {
      verifierValidationMsg.textContent = 'Pega o elige un mensaje antes de analizar.';
      verifierTextarea.focus();
      return;
    }

    verifierValidationMsg.textContent = '';
    btnAnalyze.disabled = true;
    resultIdle.hidden = true;
    resultOutput.hidden = true;
    resultLoading.hidden = false;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.verifierType,
          text,
        }),
      });

      const data = await response.json();

      if (response.status === 400 && data.message) {
        verifierValidationMsg.textContent = data.message;
        resetResultPanel();
        return;
      }

      renderVerifierResult(data);
    } catch {
      const fallbackAction =
        state.verifierType === 'oferta_trabajo'
          ? 'No pagues por capacitación ni envíes fotos de tu DNI. Busca la empresa por tu cuenta en su web oficial.'
          : 'No pagues ni compartas códigos SMS. Llama a tu familiar o entidad usando el número que ya tienes guardado.';

      renderVerifierResult({
        available: false,
        estado: 'Análisis no disponible',
        senal: 'No pudimos conectar con el servidor de análisis en este momento.',
        accion: fallbackAction,
      });
    } finally {
      btnAnalyze.disabled = false;
    }
  });

  btnListenResult.addEventListener('click', () => {
    if (!state.lastResult) return;
    speechErrorVerifier.hidden = true;
    speechErrorVerifier.textContent = '';

    const spokenText = `${state.lastResult.estado}. ${state.lastResult.senal} Acción segura: ${state.lastResult.accion}`;
    speakText(spokenText, (errMsg) => {
      speechErrorVerifier.textContent = errMsg;
      speechErrorVerifier.hidden = false;
    });
  });

  // ==========================================================================
  // F2: Cobro de Luis (Polling sin recargar + Voz única)
  // ==========================================================================
  function speakPaymentConfirmation() {
    paymentSpeechAlert.hidden = true;
    const phrase = 'Pago confirmado. Doce soles con cincuenta.';
    speakText(phrase, (errMsg) => {
      paymentSpeechMsg.textContent = errMsg;
      paymentSpeechAlert.hidden = false;
    });
  }

  btnEnableSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    btnEnableSound.setAttribute('aria-pressed', String(state.soundEnabled));

    if (state.soundEnabled) {
      btnEnableSound.textContent = '🔊 Sonido activado';
      btnEnableSound.classList.add('is-active-sound');
      // Unlock speechSynthesis on user gesture (especially important on mobile)
      speakText('Sonido activado.', (errMsg) => {
        paymentSpeechMsg.textContent = errMsg;
        paymentSpeechAlert.hidden = false;
      });
    } else {
      btnEnableSound.textContent = '🔊 Activar sonido de confirmación';
      btnEnableSound.classList.remove('is-active-sound');
    }
  });

  btnReplayPaymentVoice.addEventListener('click', () => {
    speakPaymentConfirmation();
  });

  function renderLuisCharge(charge) {
    if (!charge) return;
    state.currentCharge = charge;

    paymentAmountEl.textContent = charge.amountFormatted;
    paymentIdEl.textContent = charge.id;
    phoneExpectedId.textContent = charge.id;

    if (charge.status === 'confirmed') {
      paymentStatusBadge.className = 'status-badge status-badge--success';
      paymentStatusBadge.textContent = '✅ Pago confirmado';

      paymentBanner.className = 'payment-banner payment-banner--confirmed';
      paymentBannerTitle.textContent = 'Pago confirmado — S/ 12,50';
      paymentBannerDesc.textContent = `Abono verificado para ${charge.id}. Ya puedes entregar el pedido con tranquilidad.`;

      paymentMismatchAlert.hidden = true;

      // Simulated phone notification for Luis
      luisPhoneWaiting.hidden = true;
      luisPhoneMismatch.hidden = true;
      luisPhoneConfirmed.hidden = false;
      luisPhoneConfirmedDetail.textContent = `Abono verificado para ${charge.id} por ${charge.amountFormatted}. Ya puedes entregar el pedido.`;

      // Voice announcement ONLY ONCE per charge ID
      if (state.spokenChargeId !== charge.id) {
        state.spokenChargeId = charge.id;
        if (state.soundEnabled) {
          speakPaymentConfirmation();
        } else {
          paymentSpeechMsg.textContent =
            'El pago está confirmado. Toca el botón si deseas escuchar la confirmación por voz.';
          paymentSpeechAlert.hidden = false;
        }
      }
    } else {
      // Pending state
      paymentStatusBadge.className = 'status-badge status-badge--pending';
      paymentStatusBadge.textContent = '⏳ Esperando pago';

      paymentBanner.className = 'payment-banner payment-banner--pending';
      paymentBannerTitle.textContent = 'Esperando confirmación del abono…';
      paymentBannerDesc.textContent =
        'No entregues el pedido solo por ver una captura. Esta pantalla se actualiza sola cuando llega el pago real.';

      paymentSpeechAlert.hidden = true;
      luisPhoneConfirmed.hidden = true;
      luisPhoneWaiting.hidden = false;

      if (charge.lastNotice && charge.lastNotice.type === 'mismatch') {
        paymentMismatchAlert.hidden = false;
        paymentMismatchDetail.textContent = `${charge.lastNotice.detail} El cobro sigue en «Esperando pago».`;

        luisPhoneMismatch.hidden = false;
        luisPhoneMismatchDetail.textContent = charge.lastNotice.detail;
      } else {
        paymentMismatchAlert.hidden = true;
        luisPhoneMismatch.hidden = true;
      }
    }
  }

  async function fetchCurrentChargeForLuis() {
    try {
      const res = await fetch('/api/payments/current', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      renderLuisCharge(data.charge);
    } catch {
      // Keep last known UI state silently during transient network hiccups
    }
  }

  btnResetCharge.addEventListener('click', async () => {
    btnResetCharge.disabled = true;
    try {
      const res = await fetch('/api/payments/reset', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      state.spokenChargeId = null;
      paymentSpeechAlert.hidden = true;
      renderLuisCharge(data.charge);
    } finally {
      btnResetCharge.disabled = false;
    }
  });

  // ==========================================================================
  // View 4: Simulador de pagos (/simulador)
  // ==========================================================================
  function renderSimulatorCharge(charge, forceSyncInputs) {
    if (!charge) return;
    state.currentCharge = charge;

    simActiveId.textContent = charge.id;
    simActiveAmount.textContent = charge.amountFormatted;
    simActiveStatus.textContent = charge.status === 'confirmed' ? 'Confirmado' : 'Pendiente';
    simActiveStatus.classList.toggle('is-confirmed', charge.status === 'confirmed');

    if (forceSyncInputs || state.simLastSyncedId !== charge.id) {
      simInputId.value = charge.id;
      simInputAmount.value = charge.amount.toFixed(2);
      state.simLastSyncedId = charge.id;
    }
  }

  async function fetchCurrentChargeForSimulator(forceSyncInputs = false) {
    try {
      const res = await fetch('/api/payments/current', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      renderSimulatorCharge(data.charge, forceSyncInputs);
    } catch {
      // Ignore transient polling errors
    }
  }

  function showSimFeedback(text, isOk) {
    simFeedback.textContent = text;
    simFeedback.className = `sim-feedback ${isOk ? 'sim-feedback--ok' : 'sim-feedback--warn'}`;
    simFeedback.hidden = false;
  }

  async function sendSimulatedPayment(paymentId, amount) {
    btnSimConfirm.disabled = true;
    try {
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, amount }),
      });
      const data = await res.json();
      if (data.charge) {
        renderSimulatorCharge(data.charge, false);
      }

      if (data.accepted) {
        showSimFeedback(`✅ ${data.message} (ID ${paymentId})`, true);
      } else if (data.duplicate) {
        showSimFeedback(`ℹ️ ${data.message}`, false);
      } else {
        showSimFeedback(`⚠️ ${data.message} ${data.detail ? `(${data.detail})` : ''}`, false);
      }
    } catch {
      showSimFeedback('⚠️ No se pudo enviar el evento al servidor.', false);
    } finally {
      btnSimConfirm.disabled = false;
    }
  }

  btnSimConfirm.addEventListener('click', () => {
    sendSimulatedPayment(simInputId.value.trim(), simInputAmount.value.trim());
  });

  btnSimWrongAmount.addEventListener('click', () => {
    const activeId = state.currentCharge ? state.currentCharge.id : simInputId.value.trim();
    simInputId.value = activeId;
    simInputAmount.value = '1.25';
    sendSimulatedPayment(activeId, '1.25');
  });

  btnSimWrongId.addEventListener('click', () => {
    const wrongId = state.currentCharge?.id === 'COB-9999' ? 'COB-1111' : 'COB-9999';
    simInputId.value = wrongId;
    simInputAmount.value = '12.50';
    sendSimulatedPayment(wrongId, '12.50');
  });

  btnSimSync.addEventListener('click', () => {
    fetchCurrentChargeForSimulator(true);
    simFeedback.hidden = true;
  });

  btnToggleFakeReceipt.addEventListener('click', () => {
    const isNowVisible = fakeReceiptCard.hidden;
    fakeReceiptCard.hidden = !isNowVisible;
    btnToggleFakeReceipt.setAttribute('aria-expanded', String(isNowVisible));
    btnToggleFakeReceipt.textContent = isNowVisible
      ? 'Ocultar comprobante falso'
      : 'Mostrar comprobante falso (S/ 12,50)';
  });

  // ==========================================================================
  // Init
  // ==========================================================================
  setVerifierType('mensaje_sospechoso');
  navigate(window.location.pathname, { fromPopState: true });
})();
