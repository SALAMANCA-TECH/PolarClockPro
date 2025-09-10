document.addEventListener('DOMContentLoaded', function() {
    const App = {};



    // --- Main Application ---
    (function(App) {
        function formatMinutesToHHMMSS(minutes) {
            const totalSeconds = Math.floor(minutes * 60);
            const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
            const s = (totalSeconds % 60).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        function parseHHMMSSToMinutes(timeString) {
            if (typeof timeString !== 'string') {
                return parseFloat(timeString) || 0;
            }
            const parts = timeString.split(':');
            if (parts.length === 3) {
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const s = parseInt(parts[2], 10) || 0;
                return (h * 60) + m + (s / 60);
            }
            return parseFloat(timeString) || 0;
        }

        const clockContainer = document.querySelector('.canvas-container');
        const digitalTime = document.getElementById('digitalTime');
        const digitalDate = document.getElementById('digitalDate');

        let settings = {};
        let state = {
            mode: 'clock',
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

            Tools.update(deltaTime);

            if (digitalTime) digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
            if (digitalDate) digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;

            checkAdvancedAlarms(now);
            const toolState = Tools.getState();
            App.Clock.update(settings, { ...state, ...toolState });
            requestAnimationFrame(update);
        }
        let lastFrameTime;

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
                alarmSound: 'bell01.mp3', stopwatchSound: 'Tick_Tock.wav',
                pomodoroWorkDuration: 25,
                pomodoroShortBreakDuration: 5,
                pomodoroLongBreakDuration: 15
            };
            Object.assign(settings, defaultSettings, JSON.parse(savedSettings || '{}'));
            settings.currentColors = colorPalettes[settings.colorPreset];
            applySettingsToUI();
        }
        function applySettingsToUI() {
            document.getElementById('pomodoroWorkDuration').value = formatMinutesToHHMMSS(settings.pomodoroWorkDuration);
            document.getElementById('pomodoroShortBreakDuration').value = formatMinutesToHHMMSS(settings.pomodoroShortBreakDuration);
            document.getElementById('pomodoroLongBreakDuration').value = formatMinutesToHHMMSS(settings.pomodoroLongBreakDuration);

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
                    playSound(alarm.sound, 1.0);
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

            document.addEventListener('modechange', (e) => { state.mode = e.detail.mode; });
            document.addEventListener('play-sound', (e) => playSound(e.detail.soundFile, 1.0));
            document.addEventListener('statechange', saveState);

            setupPomodoroEventListeners();
        }

        function setupPomodoroEventListeners() {
            const pomodoroSettingsModal = document.getElementById('pomodoroSettingsModal');
            const pomodoroSettingsBtn = document.getElementById('pomodoroSettingsBtn');
            const closePomodoroSettingsBtn = document.getElementById('closePomodoroSettingsBtn');
            const workDurationInput = document.getElementById('pomodoroWorkDuration');
            const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
            const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');

            pomodoroSettingsBtn.addEventListener('click', () => {
                pomodoroSettingsModal.classList.remove('hidden');
            });

            closePomodoroSettingsBtn.addEventListener('click', () => {
                pomodoroSettingsModal.classList.add('hidden');
                document.getElementById('resetPomodoro').click();
            });

            function handleFocus(input, settingName) {
                input.value = parseHHMMSSToMinutes(input.value);
            }

            function handleChange(input, settingName) {
                let value = parseFloat(input.value);
                if (isNaN(value) || value < 0) {
                    value = settings[settingName]; // revert to old value
                }
                settings[settingName] = value;
                saveSettings();
                input.value = formatMinutesToHHMMSS(value);
            }

            workDurationInput.addEventListener('focus', () => handleFocus(workDurationInput, 'pomodoroWorkDuration'));
            workDurationInput.addEventListener('change', () => handleChange(workDurationInput, 'pomodoroWorkDuration'));

            shortBreakDurationInput.addEventListener('focus', () => handleFocus(shortBreakDurationInput, 'pomodoroShortBreakDuration'));
            shortBreakDurationInput.addEventListener('change', () => handleChange(shortBreakDurationInput, 'pomodoroShortBreakDuration'));

            longBreakDurationInput.addEventListener('focus', () => handleFocus(longBreakDurationInput, 'pomodoroLongBreakDuration'));
            longBreakDurationInput.addEventListener('change', () => handleChange(longBreakDurationInput, 'pomodoroLongBreakDuration'));
        }

        function initializeApp() {
            loadState();
            loadSettings();
            loadAdvancedAlarms();

            App.Clock = Clock; // Make Clock available on the App namespace
            Clock.init(settings, state); // Initialize the Clock
            UI.init(Clock);      // Initialize the new UI module
            Tools.init(settings); // Initialize the new Tools module

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
