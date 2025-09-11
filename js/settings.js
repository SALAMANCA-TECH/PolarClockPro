const Settings = (function() {
    const arcKeys = ['dayOfWeek', 'month', 'day', 'hours', 'minutes', 'seconds', 'weekOfYear'];

    const colorPalettes = {
        default: { dayOfWeek: { light: '#c792ea', dark: '#8f6aaf' }, month: { light: '#D05CE3', dark: '#4A0055' }, day: { light: '#81C784', dark: '#003D00' }, hours: { light: '#FF9E80', dark: '#8C1C00' }, minutes: { light: '#FFF176', dark: '#B45F06' }, seconds: { light: '#81D4FA', dark: '#002E5C' }, weekOfYear: { light: '#f78c6c', dark: '#b56a52' } },
        neon: { dayOfWeek: { light: '#da70d6', dark: '#8a2be2' }, month: { light: '#ff00ff', dark: '#800080' }, day: { light: '#00ff00', dark: '#008000' }, hours: { light: '#ff0000', dark: '#800000' }, minutes: { light: '#ffff00', dark: '#808000' }, seconds: { light: '#00ffff', dark: '#008080' }, weekOfYear: { light: '#ff7f50', dark: '#ff4500' } },
        pastel: { dayOfWeek: { light: '#dda0dd', dark: '#9370db' }, month: { light: '#f4a8e1', dark: '#a1428a' }, day: { light: '#a8f4b6', dark: '#42a155' }, hours: { light: '#f4a8a8', dark: '#a14242' }, minutes: { light: '#f4f4a8', dark: '#a1a142' }, seconds: { light: '#a8e1f4', dark: '#428aa1' }, weekOfYear: { light: '#ffdab9', dark: '#ffa07a' } },
        colorblind: { dayOfWeek: { light: '#d55e00', dark: '#a14242' }, month: { light: '#f7931a', dark: '#a45c05' }, day: { light: '#0072b2', dark: '#003c5c' }, hours: { light: '#d55e00', dark: '#7a3600' }, minutes: { light: '#f0e442', dark: '#8a8326' }, seconds: { light: '#cccccc', dark: '#666666' }, weekOfYear: { light: '#ff7f50', dark: '#ff4500' } },
        candy: { dayOfWeek: { light: '#E040FB', dark: '#AA00FF' }, month: { light: '#D500F9', dark: '#A000D0' }, day: { light: '#76FF03', dark: '#50D000' }, hours: { light: '#FF3D00', dark: '#D50000' }, minutes: { light: '#FFEA00', dark: '#FFC400' }, seconds: { light: '#00E5FF', dark: '#00B8D4' }, weekOfYear: { light: '#FF9100', dark: '#FF6D00' } }
    };

    let settings = {};

    function saveSettings() {
        localStorage.setItem('polarClockSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('polarClockSettings');
        const defaultSettings = {
            inverseMode: false,
            is24HourFormat: false,
            labelDisplayMode: 'standard',
            useGradient: true,
            colorPreset: 'default',
            showSeparators: true,
            separatorMode: 'standard',
            alarmSound: 'bell01.mp3',
            stopwatchSound: 'Tick_Tock.wav',
            arcVisibility: {
                dayOfWeek: false,
                month: true,
                day: true,
                hours: true,
                minutes: true,
                seconds: true,
                weekOfYear: false
            },
            separatorVisibility: {
                dayOfWeek: true,
                month: true,
                day: true,
                hours: true,
                minutes: true,
                seconds: true,
                weekOfYear: true
            }
        };

        // A simple migration for settings that might be missing from older saves
        const loaded = JSON.parse(savedSettings || '{}');
        settings = { ...defaultSettings, ...loaded };
        if (!loaded.arcVisibility) settings.arcVisibility = defaultSettings.arcVisibility;
        if (!loaded.separatorVisibility) settings.separatorVisibility = defaultSettings.separatorVisibility;

        settings.currentColors = colorPalettes[settings.colorPreset] || colorPalettes.default;

        applySettingsToUI();
    }

    function applySettingsToUI() {
        // Standard settings
        document.getElementById('format12').classList.toggle('active', !settings.is24HourFormat);
        document.getElementById('format24').classList.toggle('active', settings.is24HourFormat);
        ['modeStandard', 'modePercentage', 'modeRemainder'].forEach(id => document.getElementById(id).classList.remove('active'));
        document.getElementById(`mode${settings.labelDisplayMode.charAt(0).toUpperCase() + settings.labelDisplayMode.slice(1)}`).classList.add('active');
        ['presetDefault', 'presetNeon', 'presetPastel', 'presetColorblind', 'presetCandy'].forEach(id => document.getElementById(id).classList.remove('active'));
        document.getElementById(`preset${settings.colorPreset.charAt(0).toUpperCase() + settings.colorPreset.slice(1)}`).classList.add('active');
        document.getElementById('gradientToggle').checked = settings.useGradient;
        document.getElementById('inverseModeToggle').checked = settings.inverseMode;

        // Separator settings
        document.getElementById('separatorsShow').classList.toggle('active', settings.showSeparators);
        document.getElementById('separatorsHide').classList.toggle('active', !settings.showSeparators);
        document.getElementById('modeStandardSeparators').classList.toggle('active', settings.separatorMode === 'standard');
        document.getElementById('modeRuler').classList.toggle('active', settings.separatorMode === 'ruler');

        // Per-arc visibility toggles
        arcKeys.forEach(key => {
            const toggleId = `toggleArc${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = settings.arcVisibility[key];
            }
        });

        // Per-arc separator toggles
        arcKeys.forEach(key => {
            const toggleId = `toggleSeparator${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = settings.separatorVisibility[key];
            }
        });
    }

    function setupEventListeners() {
        // Standard settings listeners
        document.getElementById('format12').addEventListener('click', () => { settings.is24HourFormat = false; saveSettings(); applySettingsToUI(); });
        document.getElementById('format24').addEventListener('click', () => { settings.is24HourFormat = true; saveSettings(); applySettingsToUI(); });
        ['standard', 'percentage', 'remainder'].forEach(mode => {
            document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`).addEventListener('click', () => { settings.labelDisplayMode = mode; saveSettings(); applySettingsToUI(); });
        });
        ['default', 'neon', 'pastel', 'colorblind', 'candy'].forEach(preset => {
            document.getElementById(`preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`).addEventListener('click', () => { settings.colorPreset = preset; settings.currentColors = colorPalettes[preset]; saveSettings(); applySettingsToUI(); });
        });
        document.getElementById('gradientToggle').addEventListener('change', (e) => {
            settings.useGradient = e.target.checked;
            saveSettings();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });
        document.getElementById('inverseModeToggle').addEventListener('change', (e) => {
            settings.inverseMode = e.target.checked;
            saveSettings();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        // Separator mode listeners
        document.getElementById('modeStandardSeparators').addEventListener('click', () => { settings.separatorMode = 'standard'; saveSettings(); applySettingsToUI(); });
        document.getElementById('modeRuler').addEventListener('click', () => { settings.separatorMode = 'ruler'; saveSettings(); applySettingsToUI(); });

        // Arc visibility listeners
        arcKeys.forEach(key => {
            const toggleId = `toggleArc${key.charAt(0).toUpperCase() + key.slice(1)}`;
            document.getElementById(toggleId).addEventListener('change', (e) => {
                const numVisible = Object.values(settings.arcVisibility).filter(v => v).length;
                if (!e.target.checked && numVisible <= 1) {
                    e.target.checked = true; // Prevent hiding the last arc
                    return;
                }
                settings.arcVisibility[key] = e.target.checked;
                saveSettings();
                document.dispatchEvent(new CustomEvent('settings-requires-resize'));
            });
        });

        // "Smart" global separator toggle listeners
        document.getElementById('separatorsShow').addEventListener('click', () => {
            settings.showSeparators = true;
            // If the user clicks "Show", assume they want all separators on.
            arcKeys.forEach(key => settings.separatorVisibility[key] = true);
            saveSettings();
            applySettingsToUI();
        });

        document.getElementById('separatorsHide').addEventListener('click', () => {
            settings.showSeparators = false;
            saveSettings();
            applySettingsToUI();
        });

        // Per-arc separator visibility listeners
        arcKeys.forEach(key => {
            const toggleId = `toggleSeparator${key.charAt(0).toUpperCase() + key.slice(1)}`;
            document.getElementById(toggleId).addEventListener('change', (e) => {
                settings.separatorVisibility[key] = e.target.checked;

                if (e.target.checked) {
                    // If a separator is turned ON, the global setting should also be ON.
                    settings.showSeparators = true;
                } else {
                    // If a separator is turned OFF, check if they are all off.
                    const allSeparatorsHidden = arcKeys.every(k => !settings.separatorVisibility[k]);
                    if (allSeparatorsHidden) {
                        settings.showSeparators = false;
                    }
                }

                saveSettings();
                applySettingsToUI();
            });
        });
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
