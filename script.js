const examples = {
    base: {
        file: "base.py",
        code: `<span class="kwd">import</span> volos\n\nv = volos.connect()\nv.read()`,
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('deck: base (no modules)');
            deck.log('> v.read()');
            deck.log('volos deck ready');
        }
    },
    display: {
        file: "display.py",
        code: `<span class="kwd">import</span> volos\n\nv = volos.connect()\nv.display.write(<span class="str">"hello"</span>)`,
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: oled display');
            deck.log('> v.display.write("hello")');
            deck.setDisplay('hello');
            deck.log('display: hello');
        }
    },
    button: {
        file: "button.py",
        code: `<span class="kwd">import</span> volos\n\nv = volos.connect()\n<span class="kwd">if</span> v.button.pressed():\n    <span class="kwd">print</span>(<span class="str">"click"</span>)`,
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: keypad module');
            deck.log('> if v.button.pressed():');
            deck.log('waiting for button press… (click the deck button)');
            deck.waitForButton(function () {
                deck.log('> print("click")');
                deck.log('click');
            });
        }
    },
    sensor: {
        file: "sensor.py",
        code: `<span class="kwd">import</span> volos\n\nv = volos.connect()\n<span class="kwd">print</span>(v.sensor.temp())`,
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: temp sensor');
            deck.log('> print(v.sensor.temp())');
            const t = deck.readTemp();
            deck.log(t.toFixed(1) + '°C');
        }
    }
};

function showTab(tabName, event) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.nav-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // highlight corresponding nav button
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${tabName}'`)) {
            btn.classList.add('active');
        }
    });
}

function loadExample(key, event) {
    const selectorBtns = document.querySelectorAll('.ex-btn');
    selectorBtns.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    const ex = examples[key];
    document.getElementById('exampleFileName').innerText = ex.file;
    document.getElementById('exampleCodeContainer').innerHTML = ex.code;
    document.getElementById('runBtn').dataset.example = key;
    resetSim();
}

/* ---------- live simulator ---------- */

const sim = {
    displayText: '',
    temp: 24.6,
    waitingForButton: null,
    running: false
};

function resetSim() {
    sim.displayText = '';
    sim.waitingForButton = null;
    sim.running = false;
    document.getElementById('simConsole').innerHTML = '';
    document.getElementById('simDisplay').innerText = '';
    document.getElementById('simTemp').innerText = sim.temp.toFixed(1) + '°C';
    document.getElementById('simStatus').innerText = 'idle';
    document.getElementById('simStatus').className = 'sim-status';
    document.getElementById('runBtn').disabled = false;
    document.getElementById('runBtn').innerText = 'run';
}

const deck = {
    log: function (line) {
        const el = document.createElement('div');
        el.className = 'sim-line';
        el.textContent = line;
        document.getElementById('simConsole').appendChild(el);
        document.getElementById('simConsole').scrollTop = document.getElementById('simConsole').scrollHeight;
    },
    setDisplay: function (text) {
        sim.displayText = text;
        document.getElementById('simDisplay').innerText = text;
    },
    readTemp: function () {
        return sim.temp;
    },
    waitForButton: function (cb) {
        sim.waitingForButton = cb;
        document.getElementById('simStatus').innerText = 'waiting for button…';
        document.getElementById('simStatus').className = 'sim-status sim-waiting';
        document.getElementById('simBtn').classList.add('sim-btn-pulse');
    }
};

function runExample() {
    const key = document.getElementById('runBtn').dataset.example;
    const ex = examples[key];
    if (!ex || sim.running) return;
    sim.running = true;
    document.getElementById('runBtn').disabled = true;
    document.getElementById('runBtn').innerText = 'running…';
    document.getElementById('simConsole').innerHTML = '';
    document.getElementById('simStatus').innerText = 'running';
    document.getElementById('simStatus').className = 'sim-status sim-running';
    setTimeout(() => ex.run(deck), 250);
}

function simPressButton() {
    if (sim.waitingForButton) {
        const cb = sim.waitingForButton;
        sim.waitingForButton = null;
        document.getElementById('simBtn').classList.remove('sim-btn-pulse');
        document.getElementById('simStatus').innerText = 'done';
        document.getElementById('simStatus').className = 'sim-status sim-done';
        document.getElementById('runBtn').disabled = false;
        document.getElementById('runBtn').innerText = 'run again';
        cb();
    }
}

function simJitterTemp() {
    sim.temp = 24.6 + (Math.random() * 1.6 - 0.8);
    document.getElementById('simTemp').innerText = sim.temp.toFixed(1) + '°C';
}

/* ---------- settings that actually work ---------- */

function bindSettings() {
    document.getElementById('setContrast').addEventListener('change', function (e) {
        document.body.classList.toggle('high-contrast', e.target.checked);
    });
    document.getElementById('setCompact').addEventListener('change', function (e) {
        document.body.classList.toggle('compact', e.target.checked);
    });
    document.getElementById('setHaptics').addEventListener('change', function (e) {
        const btn = document.getElementById('simBtn');
        if (btn) btn.dataset.haptics = e.target.checked ? '1' : '0';
    });
}

/* ---------- shop toast ---------- */

function orderKit(name) {
    const toast = document.getElementById('toast');
    toast.innerText = name + ' — this is a concept site, no real orders yet :)';
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.addEventListener('DOMContentLoaded', function () {
    bindSettings();
    resetSim();
    setInterval(simJitterTemp, 3000);
});