(() => {
  const number = new Intl.NumberFormat('en-US');
  const controls = {
    customers: document.getElementById('customers'),
    inventory: document.getElementById('inventory'),
    bots: document.getElementById('bots'),
    admission: document.getElementById('admission'),
    paymentFailure: document.getElementById('paymentFailure'),
    holdTtl: document.getElementById('holdTtl'),
    policy: document.getElementById('policy'),
    atomic: document.getElementById('atomic'),
    idempotency: document.getElementById('idempotency')
  };

  if (Object.values(controls).some(control => !control)) return;

  const outputs = {
    customers: document.getElementById('customersValue'),
    inventory: document.getElementById('inventoryValue'),
    bots: document.getElementById('botsValue'),
    admission: document.getElementById('admissionValue'),
    paymentFailure: document.getElementById('paymentFailureValue'),
    holdTtl: document.getElementById('holdTtlValue')
  };

  const presets = {
    fair: {
      customers: 50000,
      inventory: 500,
      bots: 20,
      admission: 2000,
      paymentFailure: 5,
      holdTtl: 5,
      policy: 'lottery',
      atomic: true,
      idempotency: true
    },
    bots: {
      customers: 75000,
      inventory: 400,
      bots: 65,
      admission: 1250,
      paymentFailure: 10,
      holdTtl: 6,
      policy: 'risk',
      atomic: true,
      idempotency: true
    },
    fragile: {
      customers: 40000,
      inventory: 600,
      bots: 30,
      admission: 1000,
      paymentFailure: 25,
      holdTtl: 12,
      policy: 'fifo',
      atomic: false,
      idempotency: false
    }
  };

  const arrivalShape = [0.39, 0.235, 0.135, 0.08, 0.05, 0.034, 0.024, 0.017, 0.012, 0.009, 0.007, 0.007];
  const policyConfig = {
    fifo: { botPassRate: 1, botAdvantage: 2.6 },
    lottery: { botPassRate: 1, botAdvantage: 1 },
    risk: { botPassRate: 0.22, botAdvantage: 0.8 }
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const readNumber = control => Number(control.value);
  const formatMinutes = value => `${value < 10 ? value.toFixed(1) : Math.round(value)} min`;

  function readState() {
    return {
      customers: readNumber(controls.customers),
      inventory: readNumber(controls.inventory),
      bots: readNumber(controls.bots) / 100,
      admission: readNumber(controls.admission),
      paymentFailure: readNumber(controls.paymentFailure) / 100,
      holdTtl: readNumber(controls.holdTtl),
      policy: controls.policy.value,
      atomic: controls.atomic.checked,
      idempotency: controls.idempotency.checked
    };
  }

  function calculate(state) {
    const botCustomers = state.customers * state.bots;
    const humanCustomers = state.customers - botCustomers;
    const config = policyConfig[state.policy];
    const eligibleBots = botCustomers * config.botPassRate;
    const filteredBots = botCustomers - eligibleBots;
    const effectiveBots = eligibleBots * config.botAdvantage;
    const effectiveDemand = humanCustomers + effectiveBots;
    const botOrderShare = effectiveDemand ? effectiveBots / effectiveDemand : 0;

    let queue = 0;
    let peakQueue = 0;
    const arrivals = [];
    const admitted = [];

    arrivalShape.forEach(share => {
      const minuteArrivals = state.customers * share;
      queue += minuteArrivals;
      const minuteAdmitted = Math.min(queue, state.admission);
      queue -= minuteAdmitted;
      peakQueue = Math.max(peakQueue, queue);
      arrivals.push(minuteArrivals);
      admitted.push(minuteAdmitted);
    });

    const queueClearMinutes = state.customers / state.admission;
    const p95Wait = Math.max(0.1, (peakQueue / state.admission) * 0.82);
    const abandonmentRate = clamp(0.035 + Math.max(0, 4 - state.holdTtl) * 0.018, 0.025, 0.12);
    const releaseCycles = 1 + (12 / state.holdTtl) * 0.36;
    const paymentCapacity = state.inventory * releaseCycles * (1 - state.paymentFailure) * (1 - abandonmentRate);
    const eligiblePurchaseDemand = humanCustomers + eligibleBots;
    const sold = Math.max(0, Math.min(state.inventory, Math.floor(eligiblePurchaseDemand), Math.floor(paymentCapacity)));
    const reservationAttempts = Math.min(
      Math.floor(eligiblePurchaseDemand),
      Math.ceil(sold / Math.max(0.05, (1 - state.paymentFailure) * (1 - abandonmentRate)))
    );

    const burstRatio = arrivals[0] / state.admission;
    const collisionRate = clamp((burstRatio - 1) * 0.0045, 0.01, 0.16);
    const collisionCandidates = Math.max(0, Math.round(state.inventory * collisionRate));
    const unsafeConfirmations = state.atomic ? 0 : collisionCandidates;
    const confirmed = sold + unsafeConfirmations;
    const oversold = Math.max(0, confirmed - state.inventory);
    const conflictsBlocked = state.atomic ? collisionCandidates : 0;

    const paymentRetries = Math.round(reservationAttempts * state.paymentFailure);
    const duplicateRate = clamp(0.42 + burstRatio * 0.012, 0.42, 0.72);
    const duplicateCharges = state.idempotency ? 0 : Math.round(paymentRetries * duplicateRate);
    const safeRetries = state.idempotency ? paymentRetries : 0;
    const expiredHolds = Math.max(0, Math.round(reservationAttempts * (abandonmentRate + state.paymentFailure * 0.18)));

    const botOrders = Math.min(sold, Math.round(sold * botOrderShare));
    const humanOrders = Math.max(0, sold - botOrders);
    const humanAllocation = sold ? humanOrders / sold : 0;
    const humanDemandShare = state.customers ? humanCustomers / state.customers : 0;
    const humanGap = (humanAllocation - humanDemandShare) * 100;
    const sellThrough = state.inventory ? confirmed / state.inventory : 0;
    const mismatches = oversold + duplicateCharges;

    return {
      ...state,
      arrivals,
      admitted,
      peakQueue,
      queueClearMinutes,
      p95Wait,
      filteredBots,
      sold,
      confirmed,
      sellThrough,
      botOrders,
      humanOrders,
      humanAllocation,
      humanDemandShare,
      humanGap,
      conflictsBlocked,
      oversold,
      paymentRetries,
      safeRetries,
      duplicateCharges,
      expiredHolds,
      mismatches
    };
  }

  function updateControlLabels(state) {
    outputs.customers.textContent = number.format(state.customers);
    outputs.inventory.textContent = number.format(state.inventory);
    outputs.bots.textContent = `${Math.round(state.bots * 100)}%`;
    outputs.admission.textContent = `${number.format(state.admission)}/min`;
    outputs.paymentFailure.textContent = `${Math.round(state.paymentFailure * 100)}%`;
    outputs.holdTtl.textContent = `${state.holdTtl} min`;
  }

  function updateMetrics(result) {
    document.getElementById('ordersMetric').textContent = `${number.format(result.confirmed)} / ${number.format(result.inventory)}`;
    document.getElementById('ordersContext').textContent = result.oversold
      ? `${number.format(result.oversold)} promises exceed inventory`
      : `${Math.round(Math.min(1, result.sellThrough) * 100)}% sell-through`;

    document.getElementById('humanMetric').textContent = `${Math.round(result.humanAllocation * 100)}%`;
    const roundedGap = Math.round(Math.abs(result.humanGap));
    document.getElementById('humanContext').textContent = Math.abs(result.humanGap) < 1.5
      ? 'matches demand share'
      : result.humanGap > 0
        ? `${roundedGap} points above demand share`
        : `${roundedGap} points below demand share`;

    document.getElementById('waitMetric').textContent = formatMinutes(result.p95Wait);
    document.getElementById('waitContext').textContent = `queue clears in ${formatMinutes(result.queueClearMinutes)}`;
  }

  function svgElement(name, attributes = {}, text = '') {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text) element.textContent = text;
    return element;
  }

  function updateChart(result) {
    const width = 760;
    const xStart = 54;
    const xEnd = 738;
    const yTop = 24;
    const yBottom = 232;
    const chartWidth = xEnd - xStart;
    const chartHeight = yBottom - yTop;
    const rawMax = Math.max(...result.arrivals, ...result.admitted, 1);
    const step = rawMax > 20000 ? 10000 : rawMax > 8000 ? 5000 : rawMax > 3000 ? 2000 : 1000;
    const yMax = Math.ceil(rawMax / step) * step;
    const point = (value, index) => {
      const x = xStart + (chartWidth * index) / (result.arrivals.length - 1);
      const y = yBottom - (value / yMax) * chartHeight;
      return [x, y];
    };
    const linePath = values => values.map((value, index) => {
      const [x, y] = point(value, index);
      return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    const arrivalsPath = linePath(result.arrivals);
    const lastX = point(result.arrivals[result.arrivals.length - 1], result.arrivals.length - 1)[0];
    document.getElementById('arrivalsLine').setAttribute('d', arrivalsPath);
    document.getElementById('admittedLine').setAttribute('d', linePath(result.admitted));
    document.getElementById('arrivalsArea').setAttribute('d', `${arrivalsPath} L ${lastX.toFixed(1)} ${yBottom} L ${xStart} ${yBottom} Z`);

    const grid = document.getElementById('chartGrid');
    const labels = document.getElementById('chartLabels');
    grid.replaceChildren();
    labels.replaceChildren();

    [0, 0.25, 0.5, 0.75, 1].forEach(ratio => {
      const y = yBottom - ratio * chartHeight;
      grid.appendChild(svgElement('line', { x1: xStart, x2: xEnd, y1: y, y2: y, class: 'chart-grid-line' }));
      labels.appendChild(svgElement('text', { x: xStart - 9, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' }, number.format(Math.round(yMax * ratio))));
    });

    [0, 3, 6, 9, 11].forEach(index => {
      const x = point(0, index)[0];
      labels.appendChild(svgElement('text', { x, y: yBottom + 25, 'text-anchor': 'middle', class: 'chart-axis-label' }, `${index}m`));
    });

    document.getElementById('trafficChartDesc').textContent = `Traffic peaks at ${number.format(Math.round(Math.max(...result.arrivals)))} arrivals per minute while admission is capped at ${number.format(result.admission)} per minute.`;
    document.getElementById('peakQueueValue').textContent = number.format(Math.round(result.peakQueue));
    document.getElementById('queueBar').style.width = `${clamp((result.peakQueue / result.customers) * 100, 0, 100)}%`;
  }

  function updateSystem(result) {
    document.getElementById('queueStage').textContent = `${number.format(Math.round(result.peakQueue))} peak queue`;
    document.getElementById('botStage').textContent = `${number.format(Math.round(result.filteredBots))} filtered`;
    document.getElementById('inventoryStage').textContent = result.atomic
      ? `${number.format(result.conflictsBlocked)} conflicts blocked`
      : `${number.format(result.oversold)} units oversold`;
    document.getElementById('paymentStage').textContent = result.idempotency
      ? `${number.format(result.safeRetries)} safe retries`
      : `${number.format(result.duplicateCharges)} duplicate charges`;
    document.getElementById('reconcileStage').textContent = `${number.format(result.mismatches)} mismatches`;

    document.getElementById('botOrdersValue').textContent = number.format(result.botOrders);
    document.getElementById('expiredValue').textContent = number.format(result.expiredHolds);
    document.getElementById('oversoldValue').textContent = number.format(result.oversold);
    document.getElementById('duplicatesValue').textContent = number.format(result.duplicateCharges);

    document.getElementById('inventoryStageCard').classList.toggle('danger', !result.atomic);
    document.getElementById('paymentStageCard').classList.toggle('danger', !result.idempotency);

    const note = document.querySelector('.model-note');
    const headline = document.getElementById('modelHeadline');
    const explanation = document.getElementById('modelExplanation');
    note.classList.remove('warning', 'danger');

    if (result.oversold || result.duplicateCharges) {
      note.classList.add('danger');
      headline.textContent = 'The checkout is writing promises it cannot keep.';
      explanation.textContent = `${number.format(result.oversold)} oversold units and ${number.format(result.duplicateCharges)} duplicate charges now require refunds, support work, and reconciliation.`;
    } else if (result.humanGap < -8) {
      note.classList.add('warning');
      headline.textContent = 'The system is consistent, but the allocation is not neutral.';
      explanation.textContent = `Humans receive ${Math.round(Math.abs(result.humanGap))} percentage points less inventory than their share of demand. The queue policy is rewarding machine speed.`;
    } else if (result.p95Wait > 20) {
      note.classList.add('warning');
      headline.textContent = 'Inventory is safe, but the queue owns the experience.';
      explanation.textContent = `The estimated p95 wait is ${formatMinutes(result.p95Wait)}. Capacity is protected, but abandonment and queue transparency become product problems.`;
    } else {
      headline.textContent = 'The architecture is keeping its promises.';
      explanation.textContent = 'The queue shapes the burst, the reservation write protects inventory, and payment retries stay idempotent.';
    }
  }

  function render() {
    const state = readState();
    const result = calculate(state);
    updateControlLabels(state);
    updateMetrics(result);
    updateChart(result);
    updateSystem(result);
  }

  function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;
    Object.entries(preset).forEach(([key, value]) => {
      const control = controls[key];
      if (control.type === 'checkbox') control.checked = value;
      else control.value = value;
    });
    document.querySelectorAll('.preset-button').forEach(button => {
      button.classList.toggle('active', button.dataset.preset === name);
    });
    render();
  }

  Object.values(controls).forEach(control => {
    const eventName = control.type === 'range' ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      document.querySelectorAll('.preset-button').forEach(button => button.classList.remove('active'));
      render();
    });
  });

  document.querySelectorAll('.preset-button').forEach(button => {
    button.addEventListener('click', () => applyPreset(button.dataset.preset));
  });

  applyPreset('fair');
})();
