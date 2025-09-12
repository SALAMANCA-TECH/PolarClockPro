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
        Object.values(toolPanels).forEach(p => p.style.display = 'none');
        panelToShow.style.display = 'flex';
        handleActiveButton(tabToActivate, Object.values(toolTabs));
        const event = new CustomEvent('modechange', {
            detail: { mode: panelToShow.id.replace('Panel', '').toLowerCase() }
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
                    document.getElementById(`${id}-content`).innerText = text;
                })
                .catch(error => console.error(`Error fetching ${id}.txt:`, error));
        });

        // Feedback form
        const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
        submitFeedbackBtn.addEventListener('click', () => {
            const submitButton = document.getElementById('submitFeedbackBtn');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            const params = {
                from_name: "Polar Clock Pro User", // Anonymous user
                subject: document.getElementById('feedbackTitle').value,
                message: document.getElementById('feedbackMessage').value,
                reply_to: "no-reply@example.com", // Default no-reply
            };

            // Refactored EmailJS configuration for clarity
            const serviceID = "YOUR_SERVICE_ID";
            const templateID = 'YOUR_TEMPLATE_ID'; // A variable for the Template ID
            const publicKey = "YOUR_PUBLIC_KEY";

            // The send function now uses the templateID variable
            emailjs.send(serviceID, templateID, params, publicKey)
                .then(res => {
                    console.log("EmailJS response:", res);
                    document.getElementById('feedbackTitle').value = "";
                    document.getElementById('feedbackMessage').value = "";
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    alert("Feedback sent successfully!");
                })
                .catch(err => {
                    console.error("EmailJS error:", err);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                    alert("Failed to send feedback. Please try again later.");
                });
        });
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
            navButtons.goToTools.addEventListener('click', () => showView(views.tools));
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

            toolTabs.timer.addEventListener('click', () => showToolsPanel(toolPanels.timer, toolTabs.timer));
            toolTabs.pomodoro.addEventListener('click', () => showToolsPanel(toolPanels.pomodoro, toolTabs.pomodoro));
            toolTabs.stopwatch.addEventListener('click', () => showToolsPanel(toolPanels.stopwatch, toolTabs.stopwatch));

            pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
            closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));
        },
        handleActiveButton: handleActiveButton
    };
})();
