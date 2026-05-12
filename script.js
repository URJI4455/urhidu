document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       01. CONFIGURATION, SERVICE WORKER & TELEGRAM WIDGET
       ========================================================================== */
    const API_URL = 'https://urhidu-company.vercel.app/api'; // Fixed for Vercel Serverless Backend to prevent Network Errors
    const token = localStorage.getItem('urjii_token');
    
    // Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));
    }

    // Telegram Support Widget
    const tgWidget = document.createElement('a');
    tgWidget.href = "https://t.me/Everysoultestdeath"; 
    tgWidget.target = "_blank";
    tgWidget.className = "telegram-widget";
    tgWidget.innerHTML = `<i class="fa-brands fa-telegram"></i> <span>Telegram Support</span>`;
    document.body.appendChild(tgWidget);

    /* ==========================================================================
       02. GLOBAL UTILITIES (ALERTS, THEME, PASSWORD TOGGLE, NOTIFICATIONS)
       ========================================================================== */
    
    // Custom Alert UI
    window.showCustomAlert = function(message, type = 'success', callback = null) {
        const existing = document.querySelector('.custom-alert-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        const box = document.createElement('div');
        box.className = 'custom-alert-box';
        
        const icons = {
            'success': '<i class="fa-solid fa-circle-check" style="color: var(--success-color); font-size: 4rem; margin-bottom: 20px;"></i>',
            'error': '<i class="fa-solid fa-circle-xmark" style="color: var(--danger-color); font-size: 4rem; margin-bottom: 20px;"></i>',
            'info': '<i class="fa-solid fa-circle-info" style="color: var(--info-color); font-size: 4rem; margin-bottom: 20px;"></i>',
            'processing': '<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--primary-color); font-size: 4rem; margin-bottom: 20px;"></i>'
        };
        
        const showClose = type !== 'processing';
        box.innerHTML = `
            ${showClose ? '<button class="close-alert-btn">&times;</button>' : ''}
            ${icons[type] || ''}
            <div style="margin-bottom: 25px; font-size: 1.1rem; font-weight: 500; line-height: 1.6;">${message}</div>
        `;
        
        if (showClose) {
            const btn = document.createElement('button');
            btn.className = 'btn w-100 alert-ok-btn'; btn.innerText = 'OK';
            box.appendChild(btn);
            
            const closeFn = () => { overlay.remove(); if (callback) callback(); };
            box.querySelector('.close-alert-btn').onclick = closeFn;
            box.querySelector('.alert-ok-btn').onclick = closeFn;
        }
        overlay.appendChild(box); 
        document.body.appendChild(overlay);
    };

   // Platform Appearance (Dark/Light/System Mode)
    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    };

    const savedTheme = localStorage.getItem('urjii_theme') || 'dark';
    applyTheme(savedTheme);

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = document.body.classList.contains('light-mode') ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-mode');
            localStorage.setItem('urjii_theme', isLight ? 'light' : 'dark');
            themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        });
    }

    // Password Eye Toggles
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // Notification Dropdown Logic
    const notifyBtn = document.getElementById('notificationBtn');
    const notifyDropdown = document.getElementById('notificationDropdown');
    if (notifyBtn && notifyDropdown) {
        notifyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            notifyDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!notifyBtn.contains(e.target) && !notifyDropdown.contains(e.target)) {
                notifyDropdown.classList.remove('active');
            }
        });
    }

    // Newsletter Form Logic (Fixed: Connects to backend and triggers Red Notification Badge)
    document.querySelectorAll('.pro-newsletter').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const btn = form.querySelector('button[type="submit"]');
            
            if (emailInput.value) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                try {
                    const res = await fetch(`${API_URL}/newsletter`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: emailInput.value })
                    });
                    
                    if (res.ok) {
                        showCustomAlert("Newsletter Subscribed Successfully!", "success");
                        // This triggers the red badge
                        pushNotification("Subscription Active", "You will now receive updates on our latest blogs and services.");
                        form.reset();
                    } else {
                        showCustomAlert("Failed to subscribe. Try again.", "error");
                    }
                } catch (err) {
                    showCustomAlert("Network Error. Please try again.", "error");
                } finally {
                    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
                    btn.disabled = false;
                }
            }
        });
    });

    // 1. Mobile Hamburger Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('active'));
        });
    }
    
    // 2. Notification System Engine
    let notifications = JSON.parse(localStorage.getItem('urjii_notifications')) || [];
    const notifyCount = document.getElementById('notifyCount');
    const notifyBody = document.getElementById('notifyBody');

    window.pushNotification = function(title, message) {
        notifications.push({ title, message, read: false, id: Date.now() });
        localStorage.setItem('urjii_notifications', JSON.stringify(notifications));
        updateNotificationUI();
        
        const pop = document.createElement('div');
        pop.className = 'toast-popup';
        pop.innerHTML = `<strong style="font-size:1rem; margin-bottom:5px;">${title}</strong><div style="font-size:0.85rem; color:var(--text-muted);">${message}</div>`;
        document.body.appendChild(pop);
        setTimeout(() => pop.remove(), 4000);
    };

    function updateNotificationUI() {
        const unreadCount = notifications.filter(n => !n.read).length;
        if (notifyCount) { 
            notifyCount.innerText = unreadCount; 
            notifyCount.style.display = unreadCount > 0 ? 'block' : 'none'; 
        }
        if (notifyBody) {
            notifyBody.innerHTML = notifications.length === 0 ? '<div style="padding:20px; text-align:center; color:var(--text-muted);">No notifications yet.</div>' : '';
            
            [...notifications].reverse().forEach((n) => {
                const item = document.createElement('div');
                item.className = `notify-item ${n.read ? '' : 'unread'}`;
                item.innerHTML = `
                    <div style="flex-grow: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <strong>${n.title}</strong>
                            ${!n.read ? '<span style="width:8px; height:8px; background:var(--primary-color); border-radius:50%;"></span>' : ''}
                        </div>
                        <span style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; display:block;">${n.message}</span>
                    </div>
                    <button class="delete-notify-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
                `;
                
                item.querySelector('div').onclick = () => {
                    n.read = true;
                    localStorage.setItem('urjii_notifications', JSON.stringify(notifications));
                    updateNotificationUI();
                };
                
                item.querySelector('.delete-notify-btn').onclick = (e) => {
                    e.stopPropagation();
                    notifications = notifications.filter(notif => notif.id !== n.id);
                    localStorage.setItem('urjii_notifications', JSON.stringify(notifications));
                    updateNotificationUI();
                };
                notifyBody.appendChild(item);
            });
        }
    }
    updateNotificationUI();

    /* ==========================================================================
       03. SLIDERS & SCROLL ANIMATIONS
       ========================================================================== */
    const heroSlides = document.querySelectorAll('.hero-slide');
    if (heroSlides.length > 0) {
        let currSlide = 0;
        const moveSlide = (dir) => {
            heroSlides[currSlide].classList.remove('active');
            currSlide = (currSlide + dir + heroSlides.length) % heroSlides.length;
            heroSlides[currSlide].classList.add('active');
        };
        document.getElementById('heroNext')?.addEventListener('click', () => moveSlide(1));
        document.getElementById('heroPrev')?.addEventListener('click', () => moveSlide(-1));
        setInterval(() => moveSlide(1), 5000); 
    }

    const sTrack = document.getElementById('servicesTrack');
    if (sTrack) {
        let isHovered = false;
        sTrack.addEventListener('mouseenter', () => isHovered = true);
        sTrack.addEventListener('mouseleave', () => isHovered = false);
        setInterval(() => {
            if(isHovered) return; 
            if (sTrack.scrollLeft + sTrack.clientWidth >= sTrack.scrollWidth - 10) sTrack.scrollTo({ left: 0, behavior: 'smooth' }); 
            else sTrack.scrollBy({ left: 340, behavior: 'smooth' }); 
        }, 3500); 

        document.getElementById('serviceNext')?.addEventListener('click', () => sTrack.scrollBy({ left: 340, behavior: 'smooth' }));
        document.getElementById('servicePrev')?.addEventListener('click', () => sTrack.scrollBy({ left: -340, behavior: 'smooth' }));
    }

    const revealElements = document.querySelectorAll('.reveal-up, .reveal-right, .reveal-scale');
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(e => { 
                if (e.isIntersecting) { 
                    e.target.classList.add('show'); 
                    observer.unobserve(e.target); 
                } 
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
        revealElements.forEach(el => revealObserver.observe(el));
    } else { 
        revealElements.forEach(el => el.classList.add('show')); 
    }

    /* ==========================================================================
       04. STRICT VALIDATION & DROPDOWNS (EMAIL & PHONE)
       ========================================================================== */
    const validateEmail = (inputElement) => {
        const val = inputElement.value.trim();
        let errorSpan = inputElement.nextElementSibling;
        
        if (!errorSpan || !errorSpan.classList.contains('error-msg')) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'error-msg';
            errorSpan.style.cssText = 'color: var(--danger-color); font-size: 0.85rem; display: block; margin-top: 5px; font-weight: 500;';
            inputElement.parentNode.insertBefore(errorSpan, inputElement.nextSibling);
        }

        if (val === '') {
            errorSpan.innerText = '';
            inputElement.style.borderColor = 'var(--border-color)';
            return false;
        }

        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(val)) {
            errorSpan.innerText = 'Enter a valid email ending with @gmail.com';
            inputElement.style.borderColor = 'var(--danger-color)';
            return false;
        } else {
            errorSpan.innerText = '';
            inputElement.style.borderColor = 'var(--success-color)';
            return true;
        }
    };

    const validatePhone = (countrySelect, phoneInput) => {
        const countryName = countrySelect.options[countrySelect.selectedIndex]?.text.replace(/.*? /, '') || ''; 
        const val = phoneInput.value.trim();
        let errorSpan = document.getElementById(phoneInput.id + 'Error');
        
        if (!errorSpan) {
            errorSpan = document.createElement('span');
            errorSpan.id = phoneInput.id + 'Error';
            errorSpan.style.cssText = 'color: var(--danger-color); font-size: 0.85rem; display: block; margin-top: 5px; font-weight: 500;';
            phoneInput.parentNode.parentNode.appendChild(errorSpan);
        }

        if (val === '') return false;

        let isValid = false;
        let errMsg = '';

        if (countryName === 'Ethiopia') {
            if (val.startsWith('9') && val.length === 9) isValid = true;
            else if (val.startsWith('09') && val.length === 10) isValid = true;
            else errMsg = 'Ethiopian numbers must be 9 digits (starts with 9) or 10 digits (starts with 09)';
        } else {
            const min = countrySelect.options[countrySelect.selectedIndex]?.dataset.min || 7;
            const max = countrySelect.options[countrySelect.selectedIndex]?.dataset.max || 15;
            if (val.length >= min && val.length <= max) isValid = true;
            else errMsg = `Please enter a valid phone number (${min}-${max} digits)`;
        }

        if (!isValid) {
            errorSpan.innerText = errMsg;
            phoneInput.style.borderColor = 'var(--danger-color)';
            return false;
        } else {
            errorSpan.innerText = '';
            phoneInput.style.borderColor = 'var(--success-color)';
            return true;
        }
    };

    document.querySelectorAll('input[type="email"]').forEach(input => {
        input.addEventListener('input', () => validateEmail(input));
    });

    document.querySelectorAll('input[id*="Name"], input[id*="Title"], input[id*="Name"]').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z\s.-]/g, ''); 
        });
    });

    /* ==========================================================================
       05. COUNTRIES & PHONE DROPDOWNS
       ========================================================================== */
    const countriesData = [
        { name: "Ethiopia", code: "+251", flag: "🇪🇹", min: 9, max: 10 }, 
        { name: "Kenya", code: "+254", flag: "🇰🇪", min: 9, max: 10 },
        { name: "Uganda", code: "+256", flag: "🇺🇬", min: 9, max: 9 }, 
        { name: "USA", code: "+1", flag: "🇺🇸", min: 10, max: 10 },
        { name: "UK", code: "+44", flag: "🇬🇧", min: 10, max: 10 }, 
        { name: "UAE", code: "+971", flag: "🇦🇪", min: 9, max: 9 }
    ];

    document.querySelectorAll('.dynamic-country').forEach((select) => {
        select.innerHTML = '<option value="">Select Country</option>';
        countriesData.forEach(c => {
            select.innerHTML += `<option value="${c.name}" ${c.name==='Ethiopia'?'selected':''}>${c.flag} ${c.name}</option>`;
        });
    });

    document.querySelectorAll('.dynamic-phone-code').forEach((phoneSelect) => {
        phoneSelect.innerHTML = '';
        countriesData.forEach(c => {
            phoneSelect.innerHTML += `<option value="${c.code}" data-min="${c.min}" data-max="${c.max}" ${c.name==='Ethiopia'?'selected':''}>${c.flag} ${c.code}</option>`;
        });
    });

    document.querySelectorAll('.dynamic-country').forEach((select, i) => {
        const phoneSelect = document.querySelectorAll('.dynamic-phone-code')[i];
        if (phoneSelect) {
            select.addEventListener('change', (e) => {
                const country = countriesData.find(c => c.name === e.target.value);
                if (country) phoneSelect.value = country.code;
            });
        }
    });

    /* ==========================================================================
       06. ROUTING & AUTH GUARDS (Fixed 404 Errors)
       ========================================================================== */
    const authHeaderActions = document.getElementById('authHeaderActions');
    if (authHeaderActions) {
        authHeaderActions.innerHTML = token 
            ? `<a href="profile.html" class="btn btn-outline" style="border-radius: 30px; padding: 8px 20px;"><i class="fa-solid fa-user-circle"></i> Profile</a>`
            : `<a href="Auth.html" class="btn btn-outline" style="border-radius: 30px; padding: 8px 20px;">Login</a>`;
    }

    const currentPath = window.location.pathname.toLowerCase();
    
    // Protect Private Routes
    if ((currentPath.includes('order') || currentPath.includes('profile')) && !token) {
        window.location.href = "Auth.html";
    }

    // Intercept Order Buttons
    document.querySelectorAll('a[href*="order"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (!token) {
                e.preventDefault();
                showCustomAlert("Please login to access the order portal.", "info", () => { window.location.href = "Auth.html"; });
            }
        });
    });

   // Upcoming Services Intercept
    document.body.addEventListener('click', (e) => {
        const upcomingBtn = e.target.closest('[data-status="upcoming"]');
        if (upcomingBtn) {
            e.preventDefault();
            showCustomAlert("This service is currently under improvement. Please check back later.", "info");
        }
    });

    // Affiliate Button Intercept
    document.getElementById('affiliateRegisterBtn')?.addEventListener('click', () => {
        if (!token) {
            showCustomAlert("Please login or create an account to activate your affiliate dashboard.", "info", () => { window.location.href = "Auth.html"; });
        } else {
            window.location.href = "profile.html?tab=tab-affiliate";
        }
    });

    /* ==========================================================================
       07. REAL BACKEND API INTEGRATIONS: AUTHENTICATION
       ========================================================================== */
    const forms = { 
        reg: document.getElementById('registerForm'), 
        log: document.getElementById('loginForm'),
        forgot: document.getElementById('forgotPasswordForm'),
        reset: document.getElementById('resetPasswordForm')
    };

    document.getElementById('showRegisterBtn')?.addEventListener('click', () => { forms.log.style.display='none'; forms.reg.style.display='block'; document.getElementById('showRegisterBtn').classList.replace('btn-outline', 'btn'); document.getElementById('showLoginBtn').classList.replace('btn', 'btn-outline'); });
    document.getElementById('showLoginBtn')?.addEventListener('click', () => { forms.reg.style.display='none'; forms.log.style.display='block'; document.getElementById('showLoginBtn').classList.replace('btn-outline', 'btn'); document.getElementById('showRegisterBtn').classList.replace('btn', 'btn-outline'); });
    
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => { e.preventDefault(); forms.log.style.display='none'; document.getElementById('authTabs').style.display='none'; forms.forgot.style.display='block'; });
    document.getElementById('backToLoginLink')?.addEventListener('click', (e) => { e.preventDefault(); forms.forgot.style.display='none'; document.getElementById('authTabs').style.display='flex'; forms.log.style.display='block'; });

    // REGISTER API
    forms.reg?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('regEmail');
        const phoneInput = document.getElementById('regPhoneNum');
        const countrySelect = document.getElementById('regCountry');
        
        if (!validateEmail(emailInput)) return showCustomAlert("Invalid Email Format. Must be @gmail.com", "error");
        if (!validatePhone(countrySelect, phoneInput)) return showCustomAlert("Invalid Phone Number", "error");

        const pass = document.getElementById('regPassword').value;
        if (pass !== document.getElementById('regConfirmPassword').value) return showCustomAlert("Passwords don't match", "error");

        showCustomAlert("Creating account...", "processing");

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const referredBy = urlParams.get('ref') || null;

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: document.getElementById('regFirstName').value,
                    lastName: document.getElementById('regLastName').value,
                    email: emailInput.value,
                    phone: document.getElementById('regPhoneCode').value + phoneInput.value,
                    password: pass,
                    gender: document.getElementById('regGender').value,
                    age: document.getElementById('regAge').value,
                    country: countrySelect.value,
                    referredBy: referredBy
                })
            });
            const data = await res.json();
            if (res.ok) {
                showCustomAlert("Registration successful! Please login.", "success", () => document.getElementById('showLoginBtn').click());
            } else {
                showCustomAlert(data.error || "Registration failed", "error");
            }
        } catch (error) { showCustomAlert("Network error occurred.", "error"); }
    });

    // LOGIN API
    forms.log?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showCustomAlert("Logging in...", "processing");
        
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: document.getElementById('loginIdentifier').value,
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('urjii_token', data.token);
                localStorage.setItem('urjii_user', JSON.stringify(data.user));
                window.location.href = "profile.html";
            } else {
                showCustomAlert(data.error || "Invalid credentials", "error");
            }
        } catch (error) { showCustomAlert("Network error occurred.", "error"); }
    });

    // FORGOT PASSWORD API
    forms.forgot?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showCustomAlert("Requesting reset token...", "processing");
        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: document.getElementById('forgotIdentifier').value })
            });
            const data = await res.json();
            if (res.ok) {
                forms.forgot.style.display = 'none'; 
                forms.reset.style.display = 'block';
                showCustomAlert("Check your email for the reset token.", "success");
            } else {
                showCustomAlert(data.error || "Request failed", "error");
            }
        } catch (error) { showCustomAlert("Network error.", "error"); }
    });

    // RESET PASSWORD API
    forms.reset?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showCustomAlert("Resetting password...", "processing");
        try {
            const res = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resetToken: document.getElementById('resetTokenInput').value,
                    newPassword: document.getElementById('newResetPassword').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                showCustomAlert("Password reset successful! Please login.", "success", () => {
                    forms.reset.style.display = 'none'; 
                    document.getElementById('authTabs').style.display = 'flex'; 
                    forms.log.style.display = 'block';
                });
            } else {
                showCustomAlert(data.error || "Reset failed", "error");
            }
        } catch (error) { showCustomAlert("Network error.", "error"); }
    });

    /* ==========================================================================
       08. REAL BACKEND API INTEGRATIONS: ORDER PORTAL (WITH FILES)
       ========================================================================== */
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const nextBtn = document.getElementById('nextBtn');
    
    const launchDateInput = document.getElementById('launchDate');
    if (launchDateInput) launchDateInput.min = new Date().toISOString().split("T")[0];

    if (nextBtn && step1 && step2) {
        nextBtn.addEventListener('click', () => {
            let isValid = true;
            
            step1.querySelectorAll('input[required], select[required]').forEach(input => { 
                if (!input.checkValidity()) { input.reportValidity(); isValid = false; } 
            });
            
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('orderPhoneNum');

            if (!validateEmail(emailInput)) isValid = false;
            if (!validatePhone(document.getElementById('orderPhoneCode'), phoneInput)) isValid = false;

            if (isValid) {
                step1.style.display = 'none'; step2.style.display = 'block';
                document.getElementById('progressFill').style.width = '100%'; 
                document.getElementById('stepIndicator').innerText = 'Step 2 of 2 (100%)';
            }
        });
        
        document.getElementById('prevBtn').addEventListener('click', () => {
            step2.style.display = 'none'; step1.style.display = 'block';
            document.getElementById('progressFill').style.width = '50%'; 
            document.getElementById('stepIndicator').innerText = 'Step 1 of 2 (50%)';
        });
    }

    // ORDER SUBMIT API
    document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitOrderBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...'; 
        btn.disabled = true;

        const formData = new FormData();
        formData.append('fullName', document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('orderPhoneCode').value + document.getElementById('orderPhoneNum').value);
        formData.append('companyName', document.getElementById('companyName').value);
        formData.append('jobTitle', document.getElementById('jobTitle').value);
        formData.append('serviceType', document.getElementById('serviceType').value);
        formData.append('launchDate', document.getElementById('launchDate').value);
        formData.append('budgetRange', document.getElementById('budgetRange').value);
        formData.append('primaryGoal', document.getElementById('primaryGoal').value);
        formData.append('preferredCommunication', document.querySelector('input[name="preferredComm"]:checked').value);
        formData.append('hasWebsite', document.getElementById('hasWebsite').value);
        formData.append('businessProblem', document.getElementById('projectDescription').value);

        const fileInput = document.getElementById('projectFiles');
        if (fileInput && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
            }
        }

        try {
            const res = await fetch(`${API_URL}/order`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });
            const data = await res.json();
            
         if (res.ok) {
                document.getElementById('orderForm').style.display = 'none'; 
                document.getElementById('formProgressHeader').style.display = 'none'; 
                document.getElementById('orderSuccessMessage').style.display = 'block';
                pushNotification("Order Received", "Your project inquiry was submitted successfully. We will contact you soon.");
            } else {
                showCustomAlert(data.error || "Failed to submit order", "error");
                btn.innerHTML = 'Submit Project <i class="fa-solid fa-paper-plane"></i>'; btn.disabled = false;
            }
        } catch (error) {
            showCustomAlert("Network Error", "error");
            btn.innerHTML = 'Submit Project <i class="fa-solid fa-paper-plane"></i>'; btn.disabled = false;
        }
    });

    /* ==========================================================================
       09. REAL BACKEND API INTEGRATIONS: PROFILE & DASHBOARD
       ========================================================================== */
    if (currentPath.includes('profile') && token) {
        
        const loadProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    document.getElementById('displayUserName').innerText = user.firstName;
                    
                    document.getElementById('profFirstName').value = user.firstName;
                    document.getElementById('profLastName').value = user.lastName;
                    
                    const profEmail = document.getElementById('profEmail');
                    if (profEmail) profEmail.value = user.email;

                    document.getElementById('profGender').value = user.gender || 'Male';
                    document.getElementById('profAge').value = user.age || '';
                    
                    const refInput = document.getElementById('refLinkInput');
                    if (refInput) {
                        refInput.value = `${window.location.origin}/?ref=${user.referralCode}`;
                        document.getElementById('affClicks').innerText = user.referralClicks || 0;
                        document.getElementById('affSuccess').innerText = user.successfulReferrals || 0;
                        document.getElementById('affEarned').innerText = ((user.successfulReferrals || 0) * 500) + ' ETB'; 
                    }
                }
            } catch (err) { console.error(err); }
        };
        loadProfile();

        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (urlTab && document.getElementById(urlTab)) {
            document.querySelectorAll('.profile-sidebar a').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
            document.querySelector(`[data-tab="${urlTab}"]`).classList.add('active');
            document.getElementById(urlTab).style.display = 'block';
        } else {
            document.querySelectorAll('.profile-sidebar a[data-tab]').forEach(link => {
                link.addEventListener('click', (e) => {
                    document.querySelectorAll('.profile-sidebar a').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
                    e.target.classList.add('active');
                    document.getElementById(e.target.getAttribute('data-tab')).style.display = 'block';
                });
            });
        }

        const appSelect = document.getElementById('profAppearance');
        if (appSelect) {
            appSelect.value = localStorage.getItem('urjii_theme') || 'system';
            appSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                localStorage.setItem('urjii_theme', val);
                applyTheme(val);
                showCustomAlert("Appearance updated!", "success");
            });
        }

        // UPDATE PROFILE API
        document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('profEmail');
            const phoneInput = document.getElementById('profPhoneNum');
            const countrySelect = document.getElementById('profCountry');

            if (!validateEmail(emailInput)) return showCustomAlert("Invalid Email", "error");
            if (!validatePhone(countrySelect, phoneInput)) return showCustomAlert("Invalid Phone Number", "error");

            showCustomAlert("Updating profile...", "processing");
            try {
                const res = await fetch(`${API_URL}/profile`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        firstName: document.getElementById('profFirstName').value,
                        lastName: document.getElementById('profLastName').value,
                        email: document.getElementById('profEmail').value,
                        gender: document.getElementById('profGender').value,
                        age: document.getElementById('profAge').value,
                        country: document.getElementById('profCountry').value,
                        phone: document.getElementById('profPhoneCode').value + document.getElementById('profPhoneNum').value
                    })
                });
                
                const data = await res.json();
                if (res.ok) {
                    showCustomAlert("Profile updated successfully!", "success", () => window.location.reload());
                } else {
                    showCustomAlert(data.error || "Failed to update profile", "error");
                }
            } catch (error) { showCustomAlert("Network Error", "error"); }
        });

        // UPDATE PASSWORD API
        document.getElementById('passwordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmNewPassword) return showCustomAlert("New passwords do not match!", "error");

            showCustomAlert("Updating password...", "processing");
            try {
                const res = await fetch(`${API_URL}/password`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('passwordForm').reset();
                    showCustomAlert("Password updated securely!", "success");
                } else {
                    showCustomAlert(data.error || "Failed to update password", "error");
                }
            } catch (error) { showCustomAlert("Network Error", "error"); }
        });

        document.getElementById('copyRefBtn')?.addEventListener('click', () => { 
            const refInput = document.getElementById('refLinkInput');
            refInput.select(); 
            document.execCommand('copy'); 
            showCustomAlert("Referral Link copied successfully!", "success"); 
        });

        document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const isEnabled = document.getElementById('emailNotifToggle').checked;
            localStorage.setItem('urjii_email_notif', isEnabled);
            showCustomAlert("Platform settings saved successfully!", "success");
        });

        const emailToggle = document.getElementById('emailNotifToggle');
        if (emailToggle) {
            emailToggle.checked = localStorage.getItem('urjii_email_notif') !== 'false';
        }

        // SECURE LOGOUT
        document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
            showCustomAlert("Logging out securely...", "processing");
            setTimeout(() => { 
                localStorage.removeItem('urjii_token'); 
                localStorage.removeItem('urjii_user'); 
                window.location.href = 'index.html'; 
            }, 1000);
        });
    }

    /* ==========================================================================
       10. BLOG SEARCH & LOAD MORE POSTS
       ========================================================================== */
    const blogSearch = document.getElementById('blogSearch');
    if (blogSearch) {
        blogSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const blogCards = document.querySelectorAll('.blog-card');
            
            blogCards.forEach(card => {
                const cardText = card.innerText.toLowerCase();
                if (cardText.includes(searchTerm)) {
                    card.style.display = 'flex'; 
                } else {
                    card.style.display = 'none'; 
                }
            });
        });
    }

    const loadOlderBtn = document.querySelector('.fa-rotate-right')?.parentElement;
    if (loadOlderBtn) {
        loadOlderBtn.addEventListener('click', () => {
            showCustomAlert("Fetching older posts from server...", "processing");
            setTimeout(() => {
                showCustomAlert("No older posts found at the moment.", "info");
            }, 1500);
        });
    }
    
   /* ==========================================================================
       11. ADMIN DASHBOARD WORKFLOW
       ========================================================================== */
    if (currentPath.includes('admin') && token) {
        
        const user = JSON.parse(localStorage.getItem('urjii_user'));
        if (!user || user.role !== 'admin') {
            showCustomAlert("Access Denied. Admin privileges required.", "error", () => {
               window.location.href = "index.html";
            });
        } else {
            const loadAdminData = async () => {
                try {
                    const statRes = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if(statRes.ok) {
                        const stats = await statRes.json();
                        document.getElementById('statUsers').innerText = stats.totalUsers;
                        document.getElementById('statOrders').innerText = stats.pendingOrders;
                        document.getElementById('statAffiliates').innerText = stats.affiliates;
                    }

                    const ordRes = await fetch(`${API_URL}/admin/orders`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if(ordRes.ok) {
                        const orders = await ordRes.json();
                        const tbody = document.getElementById('ordersTableBody');
                        if(tbody) {
                            tbody.innerHTML = '';
                            orders.forEach(o => {
                                let badgeClass = o.status === 'Pending' ? 'status-pending' : (o.status === 'Completed' ? 'status-completed' : 'status-progress');
                                tbody.innerHTML += `
                                    <tr>
                                        <td>#${o._id.substring(o._id.length - 6).toUpperCase()}</td>
                                        <td>${o.name} <br><small style="color:var(--text-muted);">${o.companyName}</small></td>
                                        <td>${o.service}</td>
                                        <td>${o.budgetRange}</td>
                                        <td>${new Date(o.launchDate).toLocaleDateString()}</td>
                                        <td><span class="status-badge ${badgeClass}">${o.status}</span></td>
                                        <td>
                                            <button class="action-btn btn-edit"><i class="fa-solid fa-pen"></i></button>
                                            <button class="action-btn btn-delete"><i class="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            });
                        }
                    }

                    const userRes = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if(userRes.ok) {
                        const users = await userRes.json();
                        const tbody = document.getElementById('usersTableBody');
                        if(tbody) {
                            tbody.innerHTML = '';
                            users.forEach(u => {
                                tbody.innerHTML += `
                                    <tr>
                                        <td>${u.firstName} ${u.lastName}</td>
                                        <td>${u.email}</td>
                                        <td>${u.phone}</td>
                                        <td>${u.country}</td>
                                        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td><button class="action-btn btn-delete"><i class="fa-solid fa-trash"></i></button></td>
                                    </tr>
                                `;
                            });
                        }
                    }
                } catch (err) {
                    console.error("Admin Fetch Error", err);
                }
            };
            loadAdminData();

            document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
                localStorage.removeItem('urjii_token');
                localStorage.removeItem('urjii_user');
                window.location.href = "Auth.html";
            });
        }
    } else if (currentPath.includes('admin') && !token) {
        window.location.href = "Auth.html";
    } 
    
    /* ==========================================================================
       12. CONTACT, REVIEWS & FAQ
       ========================================================================== */
       
    // CONTACT API
    document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('contactEmail');
        if (!validateEmail(emailInput)) return showCustomAlert("Invalid Email. Must end with @gmail.com", "error");

        showCustomAlert("Sending message...", "processing");
        try {
            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('contactName').value,
                    email: emailInput.value,
                    subject: document.getElementById('contactSubject').value || 'Inquiry',
                    message: document.getElementById('contactMessage').value
                })
            });

            if (res.ok) {
                e.target.reset(); 
                showCustomAlert("Message sent! We'll reply shortly.", "success");
                pushNotification("Message Sent", "Your contact inquiry has been delivered to our team.");
            } else {
                const data = await res.json();
                showCustomAlert(data.error || "Failed to send message", "error");
            }
        } catch (error) { showCustomAlert("Network Error", "error"); }
    });

    // Star Rating Interactivity
    const stars = document.querySelectorAll('#reviewStarRating i');
    const ratingInput = document.getElementById('revRatingValue');
    let currentRating = 5;

    stars.forEach(star => {
        star.addEventListener('mouseover', (e) => {
            const val = e.target.getAttribute('data-val');
            stars.forEach(s => s.classList.remove('active', 'fa-solid'));
            stars.forEach(s => s.classList.add('fa-regular'));
            for(let i = 0; i < val; i++) { 
                stars[i].classList.add('active', 'fa-solid'); 
                stars[i].classList.remove('fa-regular'); 
            }
        });
        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.classList.remove('active', 'fa-solid'));
            stars.forEach(s => s.classList.add('fa-regular'));
            for(let i = 0; i < currentRating; i++) { 
                stars[i].classList.add('active', 'fa-solid'); 
                stars[i].classList.remove('fa-regular'); 
            }
        });
        star.addEventListener('click', (e) => {
            currentRating = e.target.getAttribute('data-val');
            if(ratingInput) ratingInput.value = currentRating;
        });
    });

    // REVIEW API
    document.getElementById('reviewForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showCustomAlert("Submitting review...", "processing");
        try {
            const res = await fetch(`${API_URL}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('revName').value,
                    rating: document.getElementById('revRatingValue').value,
                    review: document.getElementById('revText').value
                })
            });

         if (res.ok) {
                e.target.reset(); 
                currentRating = 5; 
                stars.forEach(s => s.classList.add('active', 'fa-solid'));
                showCustomAlert("Thank you for your feedback!", "success");
                pushNotification("Review Submitted", "Thank you! Your feedback helps us improve.");
            } else {
                const data = await res.json();
                showCustomAlert(data.error || "Failed to submit review", "error");
            }
        } catch (error) { showCustomAlert("Network Error", "error"); }
    });

    // FAQ Accordion Logics
    document.querySelectorAll('.faq-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const answer = item.querySelector('.faq-answer');
            const icon = item.querySelector('.faq-icon');
            const isOpen = item.classList.contains('active');
            
            document.querySelectorAll('.faq-item').forEach(faq => { 
                faq.classList.remove('active'); 
                faq.querySelector('.faq-answer').style.display = 'none'; 
                faq.querySelector('.faq-icon').className = 'fa-solid fa-plus faq-icon'; 
            });
            
            if (!isOpen) { 
                item.classList.add('active'); 
                answer.style.display = 'block'; 
                icon.className = 'fa-solid fa-minus faq-icon'; 
            }
        });
    });

});
