const Settings = (function() {
    const arcKeys = ['dayOfWeek', 'month', 'day', 'hours', 'minutes', 'seconds', 'weekOfYear'];

    const colorThemes = {
      "Default": {
        "dayOfWeek": "#e03a3e",
        "month": "#f5821f",
        "day": "#fdb827",
        "hours": "#61bb46",
        "minutes": "#009ddc",
        "seconds": "#963d97",
        "weekOfYear": "#ffffff"
      },
      "Neon": {
        "dayOfWeek": "#ff9900",
        "month": "#ff0000",
        "day": "#9900ff",
        "hours": "#00ff00",
        "minutes": "#ff00ff",
        "seconds": "#ffff00",
        "weekOfYear": "#00ffff"
      },
      "Pastel": {
        "dayOfWeek": "#ff80ff",
        "month": "#8080ff",
        "day": "#80ffff",
        "hours": "#80ffc0",
        "minutes": "#ffff80",
        "seconds": "#ffc080",
        "weekOfYear": "#ff8080"
      },
      "Colorblind": {
        "dayOfWeek": "#d55e00",
        "month": "#56b4e9",
        "day": "#f0e442",
        "hours": "#0072b2",
        "minutes": "#009e73",
        "seconds": "#e69f00",
        "weekOfYear": "#cc79a7"
      },
      "Candy": {
        "dayOfWeek": "#ffd700",
        "month": "#ffc0cb",
        "day": "#ff4500",
        "hours": "#00bfff",
        "minutes": "#8a2be2",
        "seconds": "#ff1493",
        "weekOfYear": "#9acd32"
      },
      "Greyscale": {
        "dayOfWeek": "#666666",
        "month": "#777777",
        "day": "#888888",
        "hours": "#999999",
        "minutes": "#aaaaaa",
        "seconds": "#bbbbbb",
        "weekOfYear": "#dddddd"
      },
      "Sunrise": {
        "dayOfWeek": "#fcd116",
        "month": "#ffd700",
        "day": "#ff8c00",
        "hours": "#ff5733",
        "minutes": "#ffb6c1",
        "seconds": "#e34234",
        "weekOfYear": "#f08080"
      },
      "Sunset": {
        "dayOfWeek": "#ff007f",
        "month": "#fd1d53",
        "day": "#ff5733",
        "hours": "#ffb400",
        "minutes": "#ff8c00",
        "seconds": "#e34234",
        "weekOfYear": "#ff6700"
      },
      "Red": { "dayOfWeek": "#ff6666", "month": "#ff3333", "day": "#ff0000", "hours": "#cc0000", "minutes": "#990000", "seconds": "#660000", "weekOfYear": "#330000" },
      "Orange": { "dayOfWeek": "#ffe6cc", "month": "#ffb366", "day": "#ff8000", "hours": "#cc6600", "minutes": "#994d00", "seconds": "#663300", "weekOfYear": "#331a00" },
      "Yellow": { "dayOfWeek": "#ffffcc", "month": "#ffff66", "day": "#ffff00", "hours": "#cccc00", "minutes": "#999900", "seconds": "#666600", "weekOfYear": "#333300" },
      "Green": { "dayOfWeek": "#ccffcc", "month": "#66ff66", "day": "#00ff00", "hours": "#00cc00", "minutes": "#009900", "seconds": "#006600", "weekOfYear": "#003300" },
      "Blue": { "dayOfWeek": "#ccccff", "month": "#6666ff", "day": "#0000ff", "hours": "#0000cc", "minutes": "#000099", "seconds": "#000066", "weekOfYear": "#000033" },
      "Purple": { "dayOfWeek": "#ffccff", "month": "#ff66ff", "day": "#ff00ff", "hours": "#cc00cc", "minutes": "#990099", "seconds": "#660066", "weekOfYear": "#330033" }
    };

    let settings = {};

    function reverseColors(colors) {
        const newColors = { ...colors };
        // Swap dayOfWeek and weekOfYear
        [newColors.dayOfWeek, newColors.weekOfYear] = [newColors.weekOfYear, newColors.dayOfWeek];
        // Swap month and seconds
        [newColors.month, newColors.seconds] = [newColors.seconds, newColors.month];
        // Swap day and minutes
        [newColors.day, newColors.minutes] = [newColors.minutes, newColors.day];
        return newColors;
    }

    function updateCurrentColors() {
        const baseColors = colorThemes[settings.colorPreset] || colorThemes.Default;
        if (settings.reverseMode) {
            settings.currentColors = reverseColors(baseColors);
        } else {
            settings.currentColors = baseColors;
        }
    }

    function saveSettings() {
        localStorage.setItem('polarClockSettings', JSON.stringify(settings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('polarClockSettings');
        const defaultSettings = {
            flowMode: false,
            showDigitalTime: true,
            showDigitalDate: true,
            showArcEndCircles: true,
            inverseMode: false,
            reverseMode: false,
            is24HourFormat: false,
            colorPreset: 'Default',
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

        updateCurrentColors();

        applySettingsToUI();
    }

    function applySettingsToUI() {
        // Standard settings
        document.getElementById('format12').classList.toggle('active', !settings.is24HourFormat);
        document.getElementById('format24').classList.toggle('active', settings.is24HourFormat);
        // Update color scheme buttons
        const colorSchemeButtons = ["Default", "Neon", "Pastel", "Colorblind", "Candy", "Greyscale", "Sunrise", "Sunset"];
        colorSchemeButtons.forEach(themeName => {
            const buttonId = `preset${themeName}`;
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.toggle('active', settings.colorPreset === themeName);
            }
        });

        // Update color palette dropdown
        const paletteSelect = document.getElementById('colorPaletteSelect');
        const paletteOptions = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];
        if (paletteOptions.includes(settings.colorPreset)) {
            paletteSelect.value = settings.colorPreset;
        } else {
            paletteSelect.value = ""; // Default to "Select Palette"
        }
        document.getElementById('inverseModeToggle').checked = settings.inverseMode;
        document.getElementById('reverseToggle').checked = settings.reverseMode;
        document.getElementById('flowModeToggle').checked = settings.flowMode;

        // New display toggles
        document.getElementById('digitalTimeToggle').checked = settings.showDigitalTime;
        document.getElementById('digitalDateToggle').checked = settings.showDigitalDate;
        document.getElementById('arcEndCirclesToggle').checked = settings.showArcEndCircles;
        document.getElementById('digitalTime').style.display = settings.showDigitalTime ? 'block' : 'none';
        document.getElementById('digitalDate').style.display = settings.showDigitalDate ? 'block' : 'none';


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
        const colorButtons = document.querySelectorAll('.color-preset-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const themeName = button.id.replace('preset', '');
                settings.colorPreset = themeName;
                updateCurrentColors();
                saveSettings();
                applySettingsToUI();
                document.dispatchEvent(new CustomEvent('settings-changed'));
            });
        });

        document.getElementById('colorPaletteSelect').addEventListener('change', (e) => {
            const themeName = e.target.value;
            if (themeName) {
                settings.colorPreset = themeName;
                updateCurrentColors();
                saveSettings();
                applySettingsToUI();
                document.dispatchEvent(new CustomEvent('settings-changed'));
            }
        });
        document.getElementById('inverseModeToggle').addEventListener('change', (e) => {
            settings.inverseMode = e.target.checked;
            saveSettings();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        document.getElementById('reverseToggle').addEventListener('change', (e) => {
            settings.reverseMode = e.target.checked;
            updateCurrentColors();
            saveSettings();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        document.getElementById('flowModeToggle').addEventListener('change', (e) => {
            settings.flowMode = e.target.checked;
            saveSettings();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        // New display toggle listeners
        document.getElementById('digitalTimeToggle').addEventListener('change', (e) => {
            settings.showDigitalTime = e.target.checked;
            saveSettings();
            applySettingsToUI();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        document.getElementById('digitalDateToggle').addEventListener('change', (e) => {
            settings.showDigitalDate = e.target.checked;
            saveSettings();
            applySettingsToUI();
            document.dispatchEvent(new CustomEvent('settings-changed'));
        });

        document.getElementById('arcEndCirclesToggle').addEventListener('change', (e) => {
            settings.showArcEndCircles = e.target.checked;
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

    function cycleColorPreset() {
        const themeNames = Object.keys(colorThemes);
        const availableThemes = themeNames.filter(name => name !== settings.colorPreset);
        const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];

        settings.colorPreset = randomTheme;
        settings.currentColors = colorThemes[randomTheme];

        saveSettings();
        applySettingsToUI();
        document.dispatchEvent(new CustomEvent('settings-changed'));
    }

    return {
        init: function() {
            loadSettings();
            setupEventListeners();
        },
        get: function() {
            return settings;
        },
        cycleColorPreset: cycleColorPreset
    };
})();
