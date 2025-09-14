document.addEventListener('DOMContentLoaded', function() {
    emailjs.init({ publicKey: 'sNYr9pKKXT9VzeDIE' });

    const accordionItems = document.querySelectorAll('.accordion-item');
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
                const contentElement = document.getElementById(`${id}-content`);
                if (contentElement) {
                    contentElement.innerHTML = `<div class="scrollable-content">${text}</div>`;
                }
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
});
