const Settings = (function() {
    const colorPalettes = {
        default: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#D05CE3', dark: '#4A0055' }, day: { light: '#81C784', dark: '#003D00' }, hours: { light: '#FF9E80', dark: '#8C1C00' }, minutes: { light: '#FFF176', dark: '#B45F06' }, seconds: { light: '#81D4FA', dark: '#002E5C' } },
        neon: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#ff00ff', dark: '#800080' }, day: { light: '#00ff00', dark: '#008000' }, hours: { light: '#ff0000', dark: '#800000' }, minutes: { light: '#ffff00', dark: '#808000' }, seconds: { light: '#00ffff', dark: '#008080' } },
        pastel: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#f4a8e1', dark: '#a1428a' }, day: { light: '#a8f4b6', dark: '#42a155' }, hours: { light: '#f4a8a8', dark: '#a14242' }, minutes: { light: '#f4f4a8', dark: '#a1a142' }, seconds: { light: '#a8e1f4', dark: '#428aa1' } },
        colorblind: { week: { light: '#82aaff', dark: '#2854a8' }, month: { light: '#f7931a', dark: '#a45c05' }, day: { light: '#0072b2', dark: '#003c5c' }, hours: { light: '#d55e00', dark: '#7a3600' }, minutes: { light: '#f0e442', dark: '#8a8326' }, seconds: { light: '#cccccc', dark: '#666666' } }
    };

    let settings = {};

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
        document.getElementById('separatorsShow').addEventListener('click', () => { settings.showSeparators = true; saveSettings(); applySettingsToUI(); document.dispatchEvent(new CustomEvent('settings-requires-resize')); });
        document.getElementById('separatorsHide').addEventListener('click', () => { settings.showSeparators = false; saveSettings(); applySettingsToUI(); document.dispatchEvent(new CustomEvent('settings-requires-resize')); });
        document.getElementById('modeStandardSeparators').addEventListener('click', () => { settings.separatorMode = 'standard'; saveSettings(); applySettingsToUI(); document.dispatchEvent(new CustomEvent('settings-requires-resize')); });
        document.getElementById('modeRuler').addEventListener('click', () => { settings.separatorMode = 'ruler'; saveSettings(); applySettingsToUI(); document.dispatchEvent(new CustomEvent('settings-requires-resize')); });
        document.getElementById('volumeControl').addEventListener('input', (e) => { settings.volume = parseFloat(e.target.value); saveSettings(); });
        document.getElementById('pomodoroGlowToggle').addEventListener('change', (e) => { settings.pomodoroGlowEnabled = e.target.checked; saveSettings(); });
        document.getElementById('pomodoroPulseToggle').addEventListener('change', (e) => { settings.pomodoroPulseEnabled = e.target.checked; saveSettings(); });
    }

    return {
        init: function() {
            loadSettings();
            setupEventListeners();
        },
        get: function() {
            return settings;
        }
    };
})();
