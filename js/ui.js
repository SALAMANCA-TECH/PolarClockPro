emailjs.init({ publicKey: 'sNYr9pKKXT9VzeDIE' });
const UI = (function() {
    const views = {
        pomodoroSettings: document.getElementById('pomodoroSettingsView'),
    };
    const navButtons = {
        toggleControls: document.getElementById('toggleControlsBtn'),
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToAbout: document.getElementById('goToAboutBtn'),
        backFromPomodoroSettings: document.getElementById('backToMainFromPomodoroSettings'),
    };
    const toolPanels = {
        timer: document.getElementById('timerPanel'),
        pomodoro: document.getElementById('pomodoroPanel'),
        stopwatch: document.getElementById('stopwatchPanel'),
    };
    const toolSelectMenu = document.getElementById('tool-select-menu');
    const toolSelectButtons = document.querySelectorAll('.tool-select-button');

    const pomodoroInfoModal = document.getElementById('pomodoroInfoModal');
    const pomodoroInfoBtn = document.getElementById('pomodoroInfoBtn');
    const closePomodoroInfoBtn = document.getElementById('closePomodoroInfoBtn');

    function showView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        if (viewToShow) {
            viewToShow.style.display = 'flex';
        }
    }

    function updateToolPanelVisibility(mode) {
        Object.values(toolPanels).forEach(p => p.classList.add('panel-hidden'));
        if (mode && toolPanels[mode]) {
            toolPanels[mode].classList.remove('panel-hidden');
        }
    }

    function toggleToolMenu() {
        toolSelectMenu.classList.toggle('panel-hidden');
    }


    return {
        init: function() {
            const optionsBtn = document.getElementById('optionsBtn');
            const bottomToolbar = document.getElementById('bottom-toolbar');

            if (optionsBtn && bottomToolbar) {
                optionsBtn.addEventListener('click', () => {
                    bottomToolbar.classList.toggle('visible');
                });
            }

            navButtons.toggleControls.addEventListener('click', toggleToolMenu);

            toolSelectButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const mode = button.dataset.mode;
                    if (mode === 'alarms') {
                        window.location.href = 'alarms.html';
                        return;
                    }
                    document.dispatchEvent(new CustomEvent('modechange', {
                        detail: { mode: mode }
                    }));
                    toolSelectMenu.classList.add('panel-hidden'); // Hide menu after selection
                });
            });

            navButtons.goToSettings.addEventListener('click', () => {
                window.location.href = 'settings.html';
            });
            navButtons.goToAbout.addEventListener('click', () => {
                window.location.href = 'about.html';
            });

            if(navButtons.backFromPomodoroSettings) {
                navButtons.backFromPomodoroSettings.addEventListener('click', () => {
                    views.pomodoroSettings.style.display = 'none';
                });
            }

            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));

            document.addEventListener('modechange', (e) => {
                updateToolPanelVisibility(e.detail.mode);
            });

            document.addEventListener('show-pomodoro-settings', () => {
                showView(views.pomodoroSettings);
            });

            const savedState = JSON.parse(localStorage.getItem('polarClockState'));
            if (savedState && savedState.mode) {
                updateToolPanelVisibility(savedState.mode);
            } else {
                // Default to 'clock' mode if no state is saved
                document.dispatchEvent(new CustomEvent('modechange', {
                    detail: { mode: 'clock' }
                }));
            }
        }
    };
})();
