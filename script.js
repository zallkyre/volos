const examples = {
    obs: {
        file: "obs.py",
        code: `<span class="kwd">import</span> volos

deck = volos.connect()

deck.key(0).on_press(<span class="kwd">lambda</span>: obs.scene(<span class="str">"live"</span>))
deck.key(1).on_press(<span class="kwd">lambda</span>: obs.scene(<span class="str">"brb"</span>))
deck.key(2).on_press(<span class="kwd">lambda</span>: obs.mute(<span class="str">"mic"</span>))`,
        module: 'none',
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('deck: 3×3 hot-swap grid');
            deck.log('> deck.key(0).on_press(...)');
            deck.log('> deck.key(1).on_press(...)');
            deck.log('> deck.key(2).on_press(...)');
            deck.log('ready — press a key on the deck');
        }
    },
    knob: {
        file: "knob.py",
        code: `<span class="kwd">import</span> volos

deck = volos.connect()
knob = deck.snap(volos.RotaryEncoder())

<span class="kwd">@knob.on_turn</span>
<span class="kwd">def</span> volume(delta):
    mixer.volume += delta * 0.05`,
        module: 'knob',
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: rotary encoder');
            deck.log('> @knob.on_turn');
            deck.log('ready — turn the knob');
        }
    },
    cluster: {
        file: "cluster.py",
        code: `<span class="kwd">import</span> volos

deck = volos.connect()
cluster = deck.snap(volos.KeyCluster())

<span class="kwd">@cluster.key(0)</span>
<span class="kwd">def</span> on_press():
    launch(<span class="str">"discord"</span>)`,
        module: 'cluster',
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: key cluster');
            deck.log('> @cluster.key(0)');
            deck.log('ready — press a cluster key');
        }
    },
    fader: {
        file: "fader.py",
        code: `<span class="kwd">import</span> volos

deck = volos.connect()
fader = deck.snap(volos.Fader())

<span class="kwd">@fader.on_move</span>
<span class="kwd">def</span> level(value):
    mixer.channel(<span class="str">"music"</span>).level = value`,
        module: 'fader',
        run: function (deck) {
            deck.log('volos 0.1.0 — sim transport connected');
            deck.log('module detected: fader');
            deck.log('> @fader.on_move');
            deck.log('ready — drag the fader');
        }
    }
};

function showTab(tabName, event) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.nav-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');

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
    gridSize: '3x3',
    running: false,
    waitingForKey: null,
    knobValue: 40,
    faderValue: 50
};

function buildGrid() {
    const grid = document.getElementById('simGrid');
    grid.innerHTML = '';
    const cols = sim.gridSize === '4x3' ? 4 : 3;
    const rows = 3;
    grid.className = 'sim-grid' + (cols === 4 ? ' grid-4x3' : '');
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const btn = document.createElement('button');
            btn.className = 'sim-key';
            btn.dataset.index = i;
            btn.textContent = String(i + 1);
            btn.addEventListener('click', () => simPressKey(i, btn));
            grid.appendChild(btn);
        }
    }
}

function buildModule(kind) {
    const el = document.getElementById('simModule');
    el.innerHTML = '';
    if (kind === 'knob') {
        el.className = 'sim-module';
        const knob = document.createElement('div');
        knob.className = 'sim-knob';
        const marker = document.createElement('div');
        marker.className = 'sim-knob-marker';
        knob.appendChild(marker);
        const label = document.createElement('div');
        label.className = 'sim-module-label';
        label.id = 'simKnobValue';
        label.textContent = 'volume ' + sim.knobValue + '%';
        const btn = document.createElement('button');
        btn.className = 'sim-module-btn';
        btn.textContent = 'turn';
        btn.addEventListener('click', () => simTurnKnob());
        el.appendChild(knob);
        el.appendChild(label);
        el.appendChild(btn);
        updateKnob();
    } else if (kind === 'cluster') {
        el.className = 'sim-module';
        const grid = document.createElement('div');
        grid.className = 'sim-cluster';
        for (let i = 0; i < 4; i++) {
            const k = document.createElement('button');
            k.className = 'sim-key sim-cluster-key';
            k.textContent = 'c' + (i + 1);
            k.addEventListener('click', () => {
                deck.log('cluster key c' + (i + 1) + ' pressed');
                k.classList.add('sim-key-flash');
                setTimeout(() => k.classList.remove('sim-key-flash'), 160);
            });
            grid.appendChild(k);
        }
        el.appendChild(grid);
    } else if (kind === 'fader') {
        el.className = 'sim-module';
        const fader = document.createElement('div');
        fader.className = 'sim-fader';
        const input = document.createElement('input');
        input.type = 'range';
        input.min = 0;
        input.max = 100;
        input.value = sim.faderValue;
        input.className = 'sim-fader-input';
        input.addEventListener('input', () => simMoveFader(input));
        const label = document.createElement('div');
        label.className = 'sim-module-label';
        label.id = 'simFaderValue';
        label.textContent = 'music ' + sim.faderValue + '%';
        fader.appendChild(input);
        el.appendChild(fader);
        el.appendChild(label);
    } else {
        el.className = 'sim-module sim-module-empty';
        el.textContent = 'no module snapped in';
    }
}

function updateKnob() {
    const marker = document.querySelector('.sim-knob-marker');
    if (marker) {
        marker.style.transform = `rotate(${sim.knobValue * 3.6}deg)`;
    }
    const label = document.getElementById('simKnobValue');
    if (label) label.textContent = 'volume ' + sim.knobValue + '%';
}

function simTurnKnob() {
    sim.knobValue = Math.max(0, Math.min(100, sim.knobValue + 5));
    updateKnob();
    deck.log('knob turned → volume ' + sim.knobValue + '%');
}

function simMoveFader(input) {
    sim.faderValue = parseInt(input.value, 10);
    const label = document.getElementById('simFaderValue');
    if (label) label.textContent = 'music ' + sim.faderValue + '%';
    deck.log('fader moved → music ' + sim.faderValue + '%');
}

function simPressKey(i, btn) {
    if (sim.waitingForKey) {
        const cb = sim.waitingForKey;
        sim.waitingForKey = null;
        cb(i);
        return;
    }
    const key = document.getElementById('runBtn').dataset.example;
    if (key === 'obs') {
        const scenes = ['live', 'brb', 'mic mute', 'camera', 'game', 'chat', 'starting soon', 'thanks', 'break'];
        const name = scenes[i] || ('key ' + (i + 1));
        deck.log('key ' + (i + 1) + ' pressed → scene: ' + name);
    } else {
        deck.log('key ' + (i + 1) + ' pressed');
    }
    btn.classList.add('sim-key-flash');
    setTimeout(() => btn.classList.remove('sim-key-flash'), 160);
}

function resetSim() {
    sim.running = false;
    sim.waitingForKey = null;
    document.getElementById('simConsole').innerHTML = '';
    document.getElementById('simStatus').innerText = 'idle';
    document.getElementById('simStatus').className = 'sim-status';
    document.getElementById('runBtn').disabled = false;
    document.getElementById('runBtn').innerText = 'run';
    buildGrid();
    const key = document.getElementById('runBtn').dataset.example;
    buildModule(examples[key] ? examples[key].module : 'none');
}

const deck = {
    log: function (line) {
        const el = document.createElement('div');
        el.className = 'sim-line';
        el.textContent = line;
        document.getElementById('simConsole').appendChild(el);
        document.getElementById('simConsole').scrollTop = document.getElementById('simConsole').scrollHeight;
    },
    waitForKey: function (cb) {
        sim.waitingForKey = cb;
        document.getElementById('simStatus').innerText = 'waiting for key…';
        document.getElementById('simStatus').className = 'sim-status sim-waiting';
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
    buildModule(ex.module);
    setTimeout(() => {
        ex.run(deck);
        document.getElementById('runBtn').disabled = false;
        document.getElementById('runBtn').innerText = 'run again';
        document.getElementById('simStatus').innerText = 'done';
        document.getElementById('simStatus').className = 'sim-status sim-done';
    }, 250);
}

/* ---------- settings that actually work ---------- */

function bindSettings() {
    document.getElementById('setGrid').addEventListener('change', function (e) {
        sim.gridSize = e.target.value;
        buildGrid();
        const toast = document.getElementById('toast');
        toast.innerText = 'grid set to ' + (sim.gridSize === '4x3' ? '4×3 (12 keys)' : '3×3 (9 keys)');
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 2000);
    });
    document.getElementById('setContrast').addEventListener('change', function (e) {
        document.body.classList.toggle('high-contrast', e.target.checked);
    });
    document.getElementById('setCompact').addEventListener('change', function (e) {
        document.body.classList.toggle('compact', e.target.checked);
    });
    document.getElementById('setHaptics').addEventListener('change', function (e) {
        document.body.dataset.haptics = e.target.checked ? '1' : '0';
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
});