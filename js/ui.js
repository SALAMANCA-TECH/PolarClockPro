emailjs.init({ publicKey: 'sNYr9pKKXT9VzeDIE' });
const UI = (function() {
    const views = {
        main: document.getElementById('mainView'),
        settings: document.getElementById('settingsView'),
        tools: document.getElementById('toolsView'),
        about: document.getElementById('aboutView'),
    };
    const navButtons = {
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToTools: document.getElementById('goToToolsBtn'),
        goToAlarms: document.getElementById('goToAlarmsBtn'),
        goToAbout: document.getElementById('goToAboutBtn'),
        backFromSettings: document.getElementById('backToMainFromSettings'),
        backFromTools: document.getElementById('backToMainFromTools'),
        backFromAbout: document.getElementById('backToMainFromAbout'),
    };
    const toolTabs = {
        default: document.getElementById('defaultTab'),
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

    function showView(viewToShow) {
        // The clock is always visible in the desktop layout, so we no longer need to pause it.
        // The panel-open class will be used for mobile-specific layout changes.
        if (viewToShow === views.main) {
            document.body.classList.remove('panel-open');
        } else {
            document.body.classList.add('panel-open');
        }

        Object.values(views).forEach(v => v.style.display = 'none');
        viewToShow.style.display = 'flex';
    }

    function handleActiveButton(clickedButton, buttonGroup) {
        buttonGroup.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }

    function showToolsPanel(panelToShow, tabToActivate) {
        Object.values(toolPanels).forEach(p => p.classList.add('panel-hidden'));
        if (panelToShow) {
            panelToShow.classList.remove('panel-hidden');
        }
        handleActiveButton(tabToActivate, Object.values(toolTabs));

        let mode = 'clock'; // Default mode
        if (panelToShow) {
            mode = panelToShow.id.replace('Panel', '').toLowerCase();
        }

        const event = new CustomEvent('modechange', {
            detail: { mode: mode }
        });
        document.dispatchEvent(event);
    }

    let aboutPageInitialized = false;

    function initAboutPage() {
        if (aboutPageInitialized) return;
        aboutPageInitialized = true;

        // Accordion logic
        const accordionItems = document.querySelectorAll('.accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');
            header.addEventListener('click', () => {
                // Close other items
                accordionItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.accordion-content').style.maxHeight = null;
                        otherItem.querySelector('.accordion-content').style.padding = '0 15px';
                    }
                });
                // Open clicked item
                item.classList.toggle('active');
                if (item.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = '15px';
                } else {
                    content.style.maxHeight = null;
                    content.style.padding = '0 15px';
                }
            });
        });

        // Content fetching
        const contentIds = ['about', 'how-to-use', 'pomodoro', 'faq'];
        contentIds.forEach(id => {
            fetch(`assets/content/${id}.txt`)
                .then(response => response.text())
                .then(text => {
                    const contentElement = document.getElementById(`${id}-content`);
                    contentElement.innerHTML = `<div class="scrollable-content">${text}</div>`;
                })
                .catch(error => console.error(`Error fetching ${id}.txt:`, error));
        });

        // Feedback form
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            const statusMessage = document.getElementById('feedbackStatus');
            feedbackForm.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent default form submission

                const submitButton = this.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Submitting...';
                }
                if(statusMessage) {
                    statusMessage.textContent = ''; // Clear previous status
                }

                const serviceID = 'service_hnc4xxb';
                const templateID = 'template_5lqcgtd';

                emailjs.sendForm(serviceID, templateID, this)
                    .then(() => {
                        if(statusMessage) {
                            statusMessage.textContent = 'Feedback sent successfully!';
                            statusMessage.style.color = '#4CAF50'; // Green for success
                        }
                        feedbackForm.reset(); // Clear the form
                    }, (err) => {
                        if(statusMessage) {
                            statusMessage.textContent = 'Failed to send feedback. Please try again later.';
                            statusMessage.style.color = '#F44336'; // Red for error
                        }
                        console.error('EmailJS error:', err);
                    })
                    .finally(() => {
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit';
                        }
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

                // Close all items before opening a new one
                accordionItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                    // Reset padding when closing
                    if (otherItem.querySelector('.accordion-content').style.padding) {
                        otherItem.querySelector('.accordion-content').style.padding = '0 15px';
                    }
                });

                // If the clicked item wasn't active, open it.
                if (!wasActive) {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = '15px'; // Set padding when opening
                }
            });
        });
    }

    return {
        init: function(clockModule) {
            Clock = clockModule; // Store the reference
            navButtons.goToSettings.addEventListener('click', () => {
                showView(views.settings);
                initSettingsAccordion();
            });
            navButtons.goToTools.addEventListener('click', () => {
                showView(views.tools);
                // When navigating to tools, default to the timer view.
                showToolsPanel(toolPanels.timer, toolTabs.timer);
            });
            navButtons.goToAbout.addEventListener('click', () => {
                showView(views.about);
                initAboutPage();
            });

            navButtons.backFromSettings.addEventListener('click', () => {
                showView(views.main);
                document.dispatchEvent(new CustomEvent('modechange', { detail: { mode: 'clock' } }));
            });
            navButtons.backFromTools.addEventListener('click', () => showView(views.main));
            navButtons.backFromAbout.addEventListener('click', () => showView(views.main));

            navButtons.goToAlarms.addEventListener('click', () => { window.location.href = 'alarms.html'; });

            // Unified tool tab event listeners
            toolTabs.default.addEventListener('click', () => showToolsPanel(null, toolTabs.default));
            toolTabs.timer.addEventListener('click', () => showToolsPanel(toolPanels.timer, toolTabs.timer));
            toolTabs.pomodoro.addEventListener('click', () => showToolsPanel(toolPanels.pomodoro, toolTabs.pomodoro));
            toolTabs.stopwatch.addEventListener('click', () => showToolsPanel(toolPanels.stopwatch, toolTabs.stopwatch));


            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));
        },
        handleActiveButton: handleActiveButton
    };
})();
