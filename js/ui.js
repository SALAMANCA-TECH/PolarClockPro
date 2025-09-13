emailjs.init({ publicKey: 'sNYr9pKKXT9VzeDIE' });
const UI = (function() {
    const views = {
        settings: document.getElementById('settingsView'),
        about: document.getElementById('aboutView'),
    };
    const navButtons = {
        toggleControls: document.getElementById('toggleControlsBtn'),
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToAlarms: document.getElementById('goToAlarmsBtn'),
        goToAbout: document.getElementById('goToAboutBtn'),
        backFromSettings: document.getElementById('backToMainFromSettings'),
        backFromAbout: document.getElementById('backToMainFromAbout'),
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

    let aboutPageInitialized = false;

    function initAboutPage() {
        if (aboutPageInitialized) return;
        aboutPageInitialized = true;

        const accordionItems = document.querySelectorAll('#aboutView .accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                accordionItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.accordion-content').style.maxHeight = null;
                        otherItem.querySelector('.accordion-content').style.padding = '0 15px';
                    }
                });
                if (!wasActive) {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = '15px';
                } else {
                    content.style.maxHeight = null;
                    content.style.padding = '0 15px';
                }
            });
        });

        const contentIds = ['about', 'how-to-use', 'pomodoro', 'faq'];
        contentIds.forEach(id => {
            fetch(`assets/content/${id}.txt`)
                .then(response => response.text())
                .then(text => {
                    document.getElementById(`${id}-content`).innerHTML = `<div class="scrollable-content">${text}</div>`;
                })
                .catch(error => console.error(`Error fetching ${id}.txt:`, error));
        });

        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            const statusMessage = document.getElementById('feedbackStatus');
            const messageTextarea = document.getElementById('feedbackMessage');
            feedbackForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const submitButton = this.querySelector('button[type="submit"]');
                statusMessage.textContent = '';
                if (messageTextarea.value.trim() === '') {
                    statusMessage.textContent = 'Message cannot be empty.';
                    statusMessage.style.color = '#F44336';
                    return;
                }
                let submissionTimestamps = JSON.parse(localStorage.getItem('feedbackSubmissions')) || [];
                submissionTimestamps = submissionTimestamps.filter(timestamp => new Date().getTime() - timestamp < 24 * 60 * 60 * 1000);
                if (submissionTimestamps.length >= 3) {
                    statusMessage.textContent = 'You have reached the submission limit for today.';
                    statusMessage.style.color = '#F44336';
                    return;
                }
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
                emailjs.sendForm('service_hnc4xxb', 'template_5lqcgtd', this)
                    .then(() => {
                        statusMessage.textContent = 'Feedback sent successfully!';
                        statusMessage.style.color = '#4CAF50';
                        feedbackForm.reset();
                        submissionTimestamps.push(new Date().getTime());
                        localStorage.setItem('feedbackSubmissions', JSON.stringify(submissionTimestamps));
                    }, (err) => {
                        statusMessage.textContent = 'Failed to send feedback. Please try again later.';
                        statusMessage.style.color = '#F44336';
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit';
                    });
            });
        }
    }

    let settingsAccordionInitialized = false;

    function initSettingsAccordion() {
        if (settingsAccordionInitialized) return;
        settingsAccordionInitialized = true;

        const accordionItems = document.querySelectorAll('#settingsView .accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                accordionItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                    if (otherItem.querySelector('.accordion-content').style.padding) {
                        otherItem.querySelector('.accordion-content').style.padding = '0 15px';
                    }
                });
                if (!wasActive) {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = '15px';
                }
            });
        });
    }

    return {
        init: function() {
            navButtons.toggleControls.addEventListener('click', toggleToolMenu);

            toolSelectButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const mode = button.dataset.mode;
                    document.dispatchEvent(new CustomEvent('modechange', {
                        detail: { mode: mode }
                    }));
                    toolSelectMenu.classList.add('panel-hidden'); // Hide menu after selection
                });
            });

            navButtons.goToSettings.addEventListener('click', () => {
                showView(views.settings);
                initSettingsAccordion();
            });
            navButtons.goToAbout.addEventListener('click', () => {
                showView(views.about);
                initAboutPage();
            });

            navButtons.backFromSettings.addEventListener('click', () => {
                views.settings.style.display = 'none';
            });
            navButtons.backFromAbout.addEventListener('click', () => {
                views.about.style.display = 'none';
            });

            navButtons.goToAlarms.addEventListener('click', () => { window.location.href = 'alarms.html'; });

            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));

            document.addEventListener('modechange', (e) => {
                updateToolPanelVisibility(e.detail.mode);
            });

            const savedState = JSON.parse(localStorage.getItem('polarClockState'));
            if (savedState && savedState.mode) {
                updateToolPanelVisibility(savedState.mode);
            }
        }
    };
})();
