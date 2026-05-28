document.addEventListener('DOMContentLoaded', () => {
    // === Multi-Step Form Logic ===
    const steps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-steps .step');
    const progressBar = document.getElementById('progress-bar');
    let currentStep = 0;

    const nextButtons = document.querySelectorAll('.btn-next');
    const prevButtons = document.querySelectorAll('.btn-prev');
    const form = document.getElementById('registrationForm');

    function updateFormSteps() {
        // Update Steps Visibility
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index === currentStep) {
                step.classList.add('active');
            }
        });

        // Update Progress Bar Width
        const progressPercentage = (currentStep / (steps.length - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;

        // Update Progress Step Indicators
        progressSteps.forEach((step, index) => {
            step.classList.remove('active');
            step.classList.remove('completed');
            
            if (index < currentStep) {
                step.classList.add('completed');
            } else if (index === currentStep) {
                step.classList.add('active');
            }
        });
    }

    // Input validation behavior
    const inputs = form.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.parentElement.classList.remove('error');
        });
        input.addEventListener('change', () => {
            if (input.value.trim() !== '') {
                input.parentElement.classList.remove('error');
            }
        });
    });

    function validateStep(stepIndex) {
        const currentStepEl = steps[stepIndex];
        const stepInputs = currentStepEl.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        stepInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.parentElement.classList.add('error');
            } else {
                input.parentElement.classList.remove('error');
                
                // Extra check for email
                if (input.type === 'email' && !input.value.includes('@')) {
                    isValid = false;
                    input.parentElement.classList.add('error');
                    const errorMsg = input.parentElement.querySelector('.error-msg');
                    if (errorMsg) errorMsg.textContent = "Invalid email format";
                }
            }
        });
        
        return isValid;
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                if (currentStep < steps.length - 1) {
                    currentStep++;
                    updateFormSteps();
                }
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                updateFormSteps();
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.innerHTML = '<svg style="animation:spin 1s linear infinite" viewBox="0 0 50 50" width="20" height="20"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 31.4" stroke-linecap="round"></circle></svg> Submitting...';
        submitBtn.disabled = true;

        if (!document.getElementById('spin-style')) {
            const s = document.createElement('style');
            s.id = 'spin-style';
            s.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
            document.head.appendChild(s);
        }

        // Collect form data
        const formData = {
            name:    document.getElementById('fullName').value.trim(),
            phone:   document.getElementById('phone').value.trim(),
            email:   document.getElementById('email').value.trim(),
            college: document.getElementById('collegeName').value.trim(),
            domain:  document.getElementById('domain').value,
            event:   'SETIP 2026: Internship & Placement Masterclass',
            date:    'Thursday, May 29, 2026',
            time:    '7:00 PM IST',
            meetLink: 'https://meet.google.com/weq-jmbk-ywi'
        };

        // Google Apps Script Web App URL — connected to Google Sheets + Email
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw72SVHK4uA0VH-j_mChyQU8V-ALe_L5XzJcETaBNru3cI_kEmFpb0XhaKpr_vRJUzz/exec';

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode:   'no-cors', // Required for Apps Script
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
        } catch (err) {
            console.warn('Submission note:', err);
            // no-cors means response is opaque — this is expected, not an error
        }

        // Show success screen regardless (no-cors gives opaque response)
        setTimeout(() => {
            form.style.display = 'none';
            document.getElementById('progress-container').style.display = 'none';
            const formHeader = document.querySelector('.form-header');
            if (formHeader) formHeader.style.display = 'none';
            const successScreen = document.getElementById('successScreen');
            if (successScreen) {
                successScreen.style.display = 'block';
                successScreen.style.animation = 'fadeUp 0.5s ease forwards';
            }
        }, 1500);
    });

    // === Countdown Timer Logic (Fixed for Total Hours) ===
    // Set target to Tomorrow 7:00 PM
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(19, 0, 0, 0);

    // === Dynamic Day Text Logic ===
    function updateDayText() {
        const dynamicDayElements = document.querySelectorAll('.dynamic-day');
        const now = new Date();
        if (now.getDate() === targetDate.getDate() && now.getMonth() === targetDate.getMonth() && now.getFullYear() === targetDate.getFullYear()) {
            dynamicDayElements.forEach(el => el.textContent = 'Today');
        } else if (now.getTime() > targetDate.getTime()) {
            dynamicDayElements.forEach(el => el.textContent = 'Now');
        } else {
            dynamicDayElements.forEach(el => el.textContent = 'Tomorrow');
        }
    }
    updateDayText();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate.getTime() - now;

        if (distance < 0) {
            document.getElementById('countdown').innerHTML = "<div style='color: var(--primary); font-weight: bold;'>Session is live now!</div>";
            return;
        }

        // Calculate total hours left without modulo 24, to support > 24 hours easily
        const totalHours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('hours').innerText = totalHours.toString().padStart(2, '0');
        document.getElementById('mins').innerText = minutes.toString().padStart(2, '0');
        document.getElementById('secs').innerText = seconds.toString().padStart(2, '0');
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

    // === Toast Notification System for Recent Registrations ===
    const namesList = [
        { initials: 'RK', name: 'Riya K., Bangalore' },
        { initials: 'AS', name: 'Aryan S., Pune' },
        { initials: 'PM', name: 'Priya M., Chennai' },
        { initials: 'VR', name: 'Vikram R., Hyderabad' },
        { initials: 'NS', name: 'Neha S., Delhi' },
        { initials: 'AB', name: 'Aditya B., Mumbai' }
    ];

    const toastContainer = document.getElementById('toast-container');
    let toastIndex = 0;

    function showNextToast() {
        if (!toastContainer) return;

        const person = namesList[toastIndex];
        toastIndex = (toastIndex + 1) % namesList.length;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-avatar">${person.initials}</div>
            <div class="toast-content">
                <strong>${person.name}</strong>
                <span>Just registered for the webinar</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Remove toast from DOM after animation completes (5s)
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 5000);
    }

    // Show first toast after 3 seconds, then every 8 seconds
    setTimeout(() => {
        showNextToast();
        setInterval(showNextToast, 8000);
    }, 3000);
});
