document.addEventListener('DOMContentLoaded', function() {
    const App = {};



    // --- Tools Module ---
    (function(App) {
        const toggleTimerBtn = document.getElementById('toggleTimerBtn');
        const resetTimerBtn = document.getElementById('resetTimer');
        const timerHoursInput = document.getElementById('timerHours');
        const timerMinutesInput = document.getElementById('timerMinutes');
        const timerSecondsInput = document.getElementById('timerSeconds');
        const intervalToggle = document.getElementById('intervalToggle');

        const toggleStopwatchBtn = document.getElementById('toggleStopwatchBtn');
        const lapStopwatchBtn = document.getElementById('lapStopwatch');
        const resetStopwatchBtn = document.getElementById('resetStopwatch');
        const lapTimesContainer = document.getElementById('lapTimes');

        const catchUpMinutesInput = document.getElementById('catchUpMinutes');
        const catchUpSecondsInput = document.getElementById('catchUpSeconds');
        const addCatchUpTimeBtn = document.getElementById('addCatchUpTimeBtn');

        App.Tools = {
            state: null,
            init: function(appState) {
                this.state = appState;
                this.setupEventListeners();
                this.updateLapDisplay();
                this.updateButtonStates();
            },
            updateButtonStates: function() {
                toggleTimerBtn.textContent = this.state.timer.isRunning ? 'Pause' : 'Start';
                toggleStopwatchBtn.textContent = this.state.stopwatch.isRunning ? 'Pause' : 'Start';
            },
            toggleTimer: function() {
                this.state.timer.isRunning ? this.pauseTimer() : this.startTimer();
            },
            startTimer: function() {
                if (this.state.timer.remainingSeconds <= 0) {
                    this.state.timer.totalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 + (parseInt(timerMinutesInput.value) || 0) * 60 + (parseInt(timerSecondsInput.value) || 0);
                    this.state.timer.remainingSeconds = this.state.timer.totalSeconds;
                }
                if (this.state.timer.remainingSeconds > 0) {
                    this.state.timer.isRunning = true;
                }
                this.updateButtonStates();
            },
            pauseTimer: function() {
                this.state.timer.isRunning = false;
                this.updateButtonStates();
            },
            resetTimer: function() {
                this.state.timer.isRunning = false;
                this.state.timer.totalSeconds = 0;
                this.state.timer.remainingSeconds = 0;
                timerHoursInput.value = "0";
                timerMinutesInput.value = "0";
                timerSecondsInput.value = "0";
                this.updateButtonStates();
            },
            toggleStopwatch: function() {
                this.state.stopwatch.isRunning ? this.pauseStopwatch() : this.startStopwatch();
            },
            startStopwatch: function() {
                this.state.stopwatch.isRunning = true;
                this.state.stopwatch.startTime = Date.now() - this.state.stopwatch.elapsedTime;
                this.updateButtonStates();
            },
            pauseStopwatch: function() {
                this.state.stopwatch.isRunning = false;
                this.updateButtonStates();
            },
            resetStopwatch: function() {
                this.state.stopwatch.isRunning = false;
                this.state.stopwatch.elapsedTime = 0;
                this.state.stopwatch.laps = [];
                this.updateLapDisplay();
                catchUpMinutesInput.value = '';
                catchUpSecondsInput.value = '';
                this.updateButtonStates();
                document.dispatchEvent(new CustomEvent('statechange'));
            },
            lapStopwatch: function() {
                if (!this.state.stopwatch.isRunning && this.state.stopwatch.elapsedTime === 0) return;
                this.state.stopwatch.laps.push({ time: this.state.stopwatch.elapsedTime, label: '' });
                this.updateLapDisplay();
                document.dispatchEvent(new CustomEvent('statechange'));
            },
            updateLapDisplay: function() {
                lapTimesContainer.innerHTML = '';
                this.state.stopwatch.laps.forEach((lap, index) => {
                    const lapElement = document.createElement('li');
                    lapElement.classList.add('lap-item');
                    lapElement.innerHTML = `
                        <span class="lap-number">Lap ${index + 1}</span>
                        <span class="lap-time">${this.formatTime(lap.time)}</span>
                        <input type="text" class="lap-label-input" value="${lap.label}" data-index="${index}" placeholder="Add label...">
                    `;
                    lapTimesContainer.prepend(lapElement);
                });
            },
            formatTime: function(ms) {
                const d = new Date(ms);
                return `${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}.${d.getUTCMilliseconds().toString().padStart(3, '0')}`;
            },
            addManualCatchUpTime: function() {
                const minutes = parseInt(catchUpMinutesInput.value) || 0;
                const seconds = parseInt(catchUpSecondsInput.value) || 0;
                const timeToAddMs = (minutes * 60 + seconds) * 1000;
                if (timeToAddMs > 0) {
                    this.state.stopwatch.elapsedTime += timeToAddMs;
                    if (this.state.stopwatch.isRunning) {
                        this.state.stopwatch.startTime -= timeToAddMs;
                    }
                    catchUpMinutesInput.value = '';
                    catchUpSecondsInput.value = '';
                    document.dispatchEvent(new CustomEvent('statechange'));
                }
            },
            setupEventListeners: function() {
                toggleTimerBtn.addEventListener('click', () => this.toggleTimer());
                resetTimerBtn.addEventListener('click', () => this.resetTimer());
                intervalToggle.addEventListener('change', (e) => this.state.timer.isInterval = e.target.checked);
                toggleStopwatchBtn.addEventListener('click', () => this.toggleStopwatch());
                resetStopwatchBtn.addEventListener('click', () => this.resetStopwatch());
                lapStopwatchBtn.addEventListener('click', () => this.lapStopwatch());
                addCatchUpTimeBtn.addEventListener('click', () => this.addManualCatchUpTime());
                lapTimesContainer.addEventListener('input', (e) => {
                    if (e.target.classList.contains('lap-label-input')) {
                        const index = parseInt(e.target.dataset.index);
                        const arrayIndex = this.state.stopwatch.laps.length - 1 - index;
                        this.state.stopwatch.laps[arrayIndex].label = e.target.value;
                        document.dispatchEvent(new CustomEvent('statechange'));
                    }
                });
            }
        };
    }(App));

    // --- Pomodoro Module ---
    (function(App) {
        const statusDisplay = document.getElementById('pomodoroStatus');
        const timerDisplay = document.getElementById('pomodoroTimerDisplay');
        const workDurationInput = document.getElementById('pomodoroWorkDuration');
        const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
        const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');

        App.Pomodoro = {
            state: null,
            settings: null,
            init: function(appState, appSettings) {
                this.state = appState;
                this.settings = appSettings;
                this.setupEventListeners();
                this.updateDisplay();
            },
            start: function() {
                if (this.state.pomodoro.isRunning) return;
                this.state.pomodoro.isRunning = true;
                if (this.state.pomodoro.remainingSeconds <= 0) {
                    this.startNextPhase();
                }
            },
            pause: function() {
                this.state.pomodoro.isRunning = false;
            },
            reset: function() {
                this.state.pomodoro.isRunning = false;
                this.state.pomodoro.phase = 'work';
                this.state.pomodoro.cycles = 0;
                this.state.pomodoro.remainingSeconds = (parseInt(workDurationInput.value) || 25) * 60;
                this.updateDisplay();
                document.dispatchEvent(new CustomEvent('pomodoro-reset'));
            },
            startNextPhase: function() {
                let nextPhase = 'work';
                let duration = (parseInt(workDurationInput.value) || 25) * 60;
                if (this.state.pomodoro.phase === 'work') {
                    this.state.pomodoro.cycles++;
                    if (this.state.pomodoro.cycles % 4 === 0) {
                        nextPhase = 'longBreak';
                        duration = (parseInt(longBreakDurationInput.value) || 15) * 60;
                    } else {
                        nextPhase = 'shortBreak';
                        duration = (parseInt(shortBreakDurationInput.value) || 5) * 60;
                    }
                }
                this.state.pomodoro.phase = nextPhase;
                this.state.pomodoro.remainingSeconds = duration;
                this.playSound();
                this.updateDisplay();
            },
            updateDisplay: function() {
                const minutes = Math.floor(this.state.pomodoro.remainingSeconds / 60);
                const seconds = Math.floor(this.state.pomodoro.remainingSeconds % 60);
                timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                let statusText = "Work Session";
                if (this.state.pomodoro.phase === 'shortBreak') statusText = "Short Break";
                if (this.state.pomodoro.phase === 'longBreak') statusText = "Long Break";
                statusDisplay.textContent = statusText;
            },
            playSound: function() {
                const event = new CustomEvent('play-sound', { detail: { soundFile: this.settings.timerSound } });
                document.dispatchEvent(event);
            },
            setupEventListeners: function() {
                document.getElementById('startPomodoro').addEventListener('click', () => this.start());
                document.getElementById('pausePomodoro').addEventListener('click', () => this.pause());
                document.getElementById('resetPomodoro').addEventListener('click', () => this.reset());
            }
        };
    }(App));

    // --- Main Application ---
    (function(App) {
        const clockContainer = document.querySelector('.canvas-container');
        const digitalTime = document.getElementById('digitalTime');
        const digitalDate = document.getElementById('digitalDate');

        let settings = {};
        let state = {
            mode: 'clock',
            timer: { totalSeconds: 0, remainingSeconds: 0, isRunning: false, isInterval: false },
            pomodoro: { isRunning: false, phase: 'work', cycles: 0, remainingSeconds: 25 * 60 },
            stopwatch: { startTime: 0, elapsedTime: 0, isRunning: false, laps: [] },
            trackedAlarm: { id: null, nextAlarmTime: null },
            advancedAlarms: [],
            lastMinuteChecked: -1
        };

        const colorPalettes = {
            default: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#D05CE3', dark: '#4A0055' }, day: { light: '#81C784', dark: '#003D00' }, hours: { light: '#FF9E80', dark: '#8C1C00' }, minutes: { light: '#FFF176', dark: '#B45F06' }, seconds: { light: '#81D4FA', dark: '#002E5C' } },
            neon: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#ff00ff', dark: '#800080' }, day: { light: '#00ff00', dark: '#008000' }, hours: { light: '#ff0000', dark: '#800000' }, minutes: { light: '#ffff00', dark: '#808000' }, seconds: { light: '#00ffff', dark: '#008080' } },
            pastel: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#f4a8e1', dark: '#a1428a' }, day: { light: '#a8f4b6', dark: '#42a155' }, hours: { light: '#f4a8a8', dark: '#a14242' }, minutes: { light: '#f4f4a8', dark: '#a1a142' }, seconds: { light: '#a8e1f4', dark: '#428aa1' } },
            colorblind: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#f7931a', dark: '#a45c05' }, day: { light: '#0072b2', dark: '#003c5c' }, hours: { light: '#d55e00', dark: '#7a3600' }, minutes: { light: '#f0e442', dark: '#8a8326' }, seconds: { light: '#cccccc', dark: '#666666' } }
        };

        function update(timestamp) {
            const now = new Date();
            const deltaTime = (timestamp - (lastFrameTime || timestamp)) / 1000;
            lastFrameTime = timestamp;

            if (state.timer.isRunning) {
                state.timer.remainingSeconds -= deltaTime;
                if (state.timer.remainingSeconds <= 0) timerFinished();
            }
            if (state.pomodoro.isRunning) {
                state.pomodoro.remainingSeconds -= deltaTime;
                App.Pomodoro.updateDisplay();
                if (state.pomodoro.remainingSeconds <= 0) App.Pomodoro.startNextPhase();
            }
            if (state.stopwatch.isRunning) {
                state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;
            }

            if (digitalTime) digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
            if (digitalDate) digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;

            checkAdvancedAlarms(now);
            App.Clock.update(settings, state);
            requestAnimationFrame(update);
        }
        let lastFrameTime;

        function timerFinished() {
            playSound(settings.timerSound, settings.volume);
            if (state.timer.isInterval) {
                state.timer.remainingSeconds = state.timer.totalSeconds;
            } else {
                App.Tools.resetTimer();
            }
        }

        function saveState() { localStorage.setItem('polarClockState', JSON.stringify(state)); }
        function loadState() {
            const savedState = localStorage.getItem('polarClockState');
            if (savedState) {
                Object.assign(state, JSON.parse(savedState));
                state.timer.isRunning = false;
                state.stopwatch.isRunning = false;
                state.pomodoro.isRunning = false;
            }
        }
        function saveSettings() { localStorage.setItem('polarClockSettings', JSON.stringify(settings)); }
        function loadSettings() {
            const savedSettings = localStorage.getItem('polarClockSettings');
            const defaultSettings = {
                is24HourFormat: false, labelDisplayMode: 'standard', useGradient: true, colorPreset: 'default',
                showSeparators: true,
                separatorMode: 'standard',
                volume: 1.0, timerSound: 'bell01.mp3', alarmSound: 'bell01.mp3', stopwatchSound: 'Tick_Tock.wav', pomodoroGlowEnabled: true, pomodoroPulseEnabled: true
            };
            Object.assign(settings, defaultSettings, JSON.parse(savedSettings || '{}'));
            settings.currentColors = colorPalettes[settings.colorPreset];
            applySettingsToUI();
        }
        function applySettingsToUI() {
            document.getElementById('format12').classList.toggle('active', !settings.is24HourFormat);
            document.getElementById('format24').classList.toggle('active', settings.is24HourFormat);
            ['modeStandard', 'modePercentage', 'modeRemainder'].forEach(id => document.getElementById(id).classList.remove('active'));
            document.getElementById(`mode${settings.labelDisplayMode.charAt(0).toUpperCase() + settings.labelDisplayMode.slice(1)}`).classList.add('active');
            ['presetDefault', 'presetNeon', 'presetPastel', 'presetColorblind'].forEach(id => document.getElementById(id).classList.remove('active'));
            document.getElementById(`preset${settings.colorPreset.charAt(0).toUpperCase() + settings.colorPreset.slice(1)}`).classList.add('active');
            document.getElementById('gradientToggle').checked = settings.useGradient;
            document.getElementById('separatorsShow').classList.toggle('active', settings.showSeparators);
            document.getElementById('separatorsHide').classList.toggle('active', !settings.showSeparators);
            document.getElementById('modeStandardSeparators').classList.toggle('active', settings.separatorMode === 'standard');
            document.getElementById('modeRuler').classList.toggle('active', settings.separatorMode === 'ruler');
            document.getElementById('volumeControl').value = settings.volume;
            document.getElementById('pomodoroGlowToggle').checked = settings.pomodoroGlowEnabled;
            document.getElementById('pomodoroPulseToggle').checked = settings.pomodoroPulseEnabled;
        }

        function loadAdvancedAlarms() {
            const storedAlarms = localStorage.getItem('polarAlarms');
            if (storedAlarms) state.advancedAlarms = JSON.parse(storedAlarms);
        }
        function checkAdvancedAlarms(now) {
            const currentMinute = now.getMinutes();
            if (currentMinute === state.lastMinuteChecked) return;
            state.lastMinuteChecked = currentMinute;
            const currentDay = now.getDay();
            const currentHour = now.getHours();
            state.advancedAlarms.forEach(alarm => {
                if (alarm.enabled && convertTo24Hour(alarm.hour, alarm.ampm) === currentHour && parseInt(alarm.minute) === currentMinute && (alarm.days.length === 0 || alarm.days.includes(currentDay))) {
                    playSound(alarm.sound, settings.volume);
                    if (alarm.isTemporary) {
                        alarm.enabled = false;
                        localStorage.setItem('polarAlarms', JSON.stringify(state.advancedAlarms));
                    }
                }
            });
        }

        function convertTo24Hour(hour, ampm) {
            hour = parseInt(hour);
            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            return hour;
        }
        function playSound(soundFile, volume) {
            if (!soundFile) return;
            const audio = new Audio(`assets/Sounds/${soundFile}`);
            audio.volume = volume;
            audio.play().catch(e => console.error("Error playing sound:", e));
        }

        function setupEventListeners() {
            document.getElementById('format12').addEventListener('click', () => { settings.is24HourFormat = false; saveSettings(); applySettingsToUI(); });
            document.getElementById('format24').addEventListener('click', () => { settings.is24HourFormat = true; saveSettings(); applySettingsToUI(); });
            ['standard', 'percentage', 'remainder'].forEach(mode => {
                document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`).addEventListener('click', () => { settings.labelDisplayMode = mode; saveSettings(); applySettingsToUI(); });
            });
            ['default', 'neon', 'pastel', 'colorblind'].forEach(preset => {
                document.getElementById(`preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`).addEventListener('click', () => { settings.colorPreset = preset; settings.currentColors = colorPalettes[preset]; saveSettings(); applySettingsToUI(); });
            });
            document.getElementById('gradientToggle').addEventListener('change', (e) => { settings.useGradient = e.target.checked; saveSettings(); });
            document.getElementById('separatorsShow').addEventListener('click', () => { settings.showSeparators = true; saveSettings(); applySettingsToUI(); App.Clock.resize(); });
            document.getElementById('separatorsHide').addEventListener('click', () => { settings.showSeparators = false; saveSettings(); applySettingsToUI(); App.Clock.resize(); });
            document.getElementById('modeStandardSeparators').addEventListener('click', () => { settings.separatorMode = 'standard'; saveSettings(); applySettingsToUI(); App.Clock.resize(); });
            document.getElementById('modeRuler').addEventListener('click', () => { settings.separatorMode = 'ruler'; saveSettings(); applySettingsToUI(); App.Clock.resize(); });
            document.getElementById('volumeControl').addEventListener('input', (e) => { settings.volume = parseFloat(e.target.value); saveSettings(); });
            document.getElementById('pomodoroGlowToggle').addEventListener('change', (e) => { settings.pomodoroGlowEnabled = e.target.checked; saveSettings(); });
            document.getElementById('pomodoroPulseToggle').addEventListener('change', (e) => { settings.pomodoroPulseEnabled = e.target.checked; saveSettings(); });

            document.addEventListener('modechange', (e) => { state.mode = e.detail.mode; });
            document.addEventListener('play-sound', (e) => playSound(e.detail.soundFile, settings.volume));
            document.addEventListener('statechange', saveState);
        }

        function initializeApp() {
            loadState();
            loadSettings();
            loadAdvancedAlarms();

            App.Clock = Clock; // Make Clock available on the App namespace
            UI.init(Clock);      // Initialize the new UI module
            App.Clock.init(settings, state); // Initialize the clock
            App.Tools.init(state);
            App.Pomodoro.init(state, settings);

            setupEventListeners();
            requestAnimationFrame(update);

            document.addEventListener('clockready', () => {
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) {
                    loadingOverlay.style.opacity = '0';
                    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
                }
            }, { once: true });

            setTimeout(() => {
                console.log("Forcing initial resize.");
                App.Clock.resize();
            }, 100);
        }

        initializeApp();
    }(App));
});
