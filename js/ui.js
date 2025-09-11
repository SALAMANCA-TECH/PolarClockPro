const UI = (function() {
    const views = {
        main: document.getElementById('mainView'),
        settings: document.getElementById('settingsView'),
        tools: document.getElementById('toolsView'),
    };
    const navButtons = {
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToTools: document.getElementById('goToToolsBtn'),
        goToAlarms: document.getElementById('goToAlarmsBtn'),
        backFromSettings: document.getElementById('backToMainFromSettings'),
        backFromTools: document.getElementById('backToMainFromTools'),
    };
    const toolTabs = {
        timer: document.getElementById('timerTab'),
        pomodoro: document.getElementById('pomodoroTab'),
        stopwatch: document.getElementById('stopwatchTab'),
    };
    const toolPanels = {
        timer: document.getElementById('timerPanel'),
        pomodoro: document.getElementById('pomodoroPanel'),
        stopwatch: document.getElementById('stopwatchPanel'),
    };
    const pomodoroInfoModal = document.getElementById('pomodoroInfoModal');
    const pomodoroInfoBtn = document.getElementById('pomodoroInfoBtn');
    const closePomodoroInfoBtn = document.getElementById('closePomodoroInfoBtn');

    let Clock; // To hold the clock module reference
    let settings; // To hold the settings object reference

    const arcToggles = {
        dayOfWeek: document.getElementById('toggleArcDayOfWeek'),
        month: document.getElementById('toggleArcMonth'),
        day: document.getElementById('toggleArcDay'),
        hours: document.getElementById('toggleArcHours'),
        minutes: document.getElementById('toggleArcMinutes'),
        seconds: document.getElementById('toggleArcSeconds'),
        weekOfYear: document.getElementById('toggleArcWeekOfYear')
    };

    function showView(viewToShow) {
        const isMainView = viewToShow === views.main;
        if (Clock) {
            if (isMainView) {
                Clock.resume();
            } else {
                Clock.pause();
            }
        }
        Object.values(views).forEach(v => v.style.display = 'none');
        viewToShow.style.display = 'flex';
    }

    function handleActiveButton(clickedButton, buttonGroup) {
        buttonGroup.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }

    function showToolsPanel(panelToShow, tabToActivate) {
        Object.values(toolPanels).forEach(p => p.style.display = 'none');
        panelToShow.style.display = 'flex';
        handleActiveButton(tabToActivate, Object.values(toolTabs));
        const event = new CustomEvent('modechange', {
            detail: { mode: panelToShow.id.replace('Panel', '').toLowerCase() }
        });
        document.dispatchEvent(event);
    }

    return {
        init: function(clockModule, appSettings) {
            Clock = clockModule; // Store the reference
            settings = appSettings; // Store the reference
            navButtons.goToSettings.addEventListener('click', () => showView(views.settings));
            navButtons.goToTools.addEventListener('click', () => showView(views.tools));
            navButtons.backFromSettings.addEventListener('click', () => {
                showView(views.main);
                document.dispatchEvent(new CustomEvent('modechange', { detail: { mode: 'clock' } }));
            });
            navButtons.backFromTools.addEventListener('click', () => showView(views.main));
            navButtons.goToAlarms.addEventListener('click', () => { window.location.href = 'alarms.html'; });

            toolTabs.timer.addEventListener('click', () => showToolsPanel(toolPanels.timer, toolTabs.timer));
            toolTabs.pomodoro.addEventListener('click', () => showToolsPanel(toolPanels.pomodoro, toolTabs.pomodoro));
            toolTabs.stopwatch.addEventListener('click', () => showToolsPanel(toolPanels.stopwatch, toolTabs.stopwatch));

            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));

            for (const arcKey in arcToggles) {
                const toggle = arcToggles[arcKey];
                if (toggle) {
                    toggle.addEventListener('change', (e) => {
                        const numVisible = Object.values(settings.arcVisibility).filter(v => v).length;
                        if (numVisible === 1 && !e.target.checked) {
                            e.target.checked = true;
                            return;
                        }
                        settings.arcVisibility[arcKey] = e.target.checked;
                        document.dispatchEvent(new CustomEvent('settingschange'));
                        Clock.resize();
                    });
                }
            }
        },
        handleActiveButton: handleActiveButton
    };
})();
