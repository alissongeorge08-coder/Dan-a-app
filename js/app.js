/* ====================================================
   SERTÃO DANÇA — app.js
   ==================================================== */

const app = {

    /* ---------- State ---------- */
    state: {
        currentView:      'home',
        isMirrored:       false,
        tipsOpen:         false,
        minutesActive:    120,
        isLoggedIn:       false,
        user:             null,          // { name, email, password }
        users:            [],            // simulated local "database"
    },

    /* ======================================================
       INITIALIZATION
       ====================================================== */
    init() {
        // Seed demo user if none exist
        const savedUsers = localStorage.getItem('sertao_users');
        if (savedUsers) {
            this.state.users = JSON.parse(savedUsers);
        }
        if (!this.state.users.find(u => u.email === 'ana@sertaodanca.com')) {
            this.state.users.push({ name: 'Ana Paula Souza', email: 'ana@sertaodanca.com', password: 'demo123', role: 'student' });
            localStorage.setItem('sertao_users', JSON.stringify(this.state.users));
        }
        if (!this.state.users.find(u => u.email === 'prof@sertaodanca.com')) {
            this.state.users.push({ name: 'Prof. Mestre Vitalino', email: 'prof@sertaodanca.com', password: 'admin123', role: 'educator' });
            localStorage.setItem('sertao_users', JSON.stringify(this.state.users));
        }

        // Restore session from localStorage
        const saved = localStorage.getItem('sertao_user');
        if (saved) {
            const user = JSON.parse(saved);
            this.state.user       = user;
            this.state.isLoggedIn = true;
        }

        this._syncProfileUI();
        this._updateNav('home');

        // Bind modal forms
        document.getElementById('form-login').addEventListener('submit',    e => { e.preventDefault(); this._handleLogin(); });
        document.getElementById('form-register').addEventListener('submit', e => { e.preventDefault(); this._handleRegister(); });

        // Close modal on backdrop click
        document.getElementById('auth-modal').addEventListener('click', e => {
            if (e.target === document.getElementById('auth-modal')) this.closeAuthModal();
        });

        console.log('Sertão Dança v2 initialized.');
    },



    /* ======================================================
       NAVIGATION
       ====================================================== */
    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewId}`);
        if (target) target.classList.add('active');
        this.state.currentView = viewId;
        this._updateNav(viewId);
    },

    _updateNav(viewId) {
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active');
            el.removeAttribute('aria-current');
        });
        const active = document.getElementById(`nav-${viewId}`);
        if (active) {
            active.classList.add('active');
            active.setAttribute('aria-current', 'page');
        }
    },

    /* ======================================================
       LESSONS
       ====================================================== */
    startLesson(title, dance = 'quadrilha') {
        // Store context so back button goes to correct place
        this.state.currentDance  = dance;
        this.state.lessonTitle   = title;
        this.state.playerSeconds = 0;
        this.state.playerPlaying = true;
        this.state.feedbackShown = false;
        this.state.lastTapTime   = 0;

        // Update player UI
        document.getElementById('current-lesson-title').innerText   = title;
        document.getElementById('video-lesson-top-title').innerText = title;
        document.getElementById('video-dance-tag').innerText = dance === 'xaxado' ? 'Xaxado' : 'Quadrilha';
        document.getElementById('current-lesson-sub').innerText = dance === 'xaxado' ? 'Iniciante • 10 min' : 'Intermediário • 5 min';
        document.getElementById('player-total').innerText = dance === 'xaxado' ? '10:00' : '5:00';
        this.state.playerDuration = dance === 'xaxado' ? 600 : 300;

        this.navigate('experience');
        this._startPlayerTimer();
        this._showControls();   // mostra controles ao iniciar
        if (navigator.vibrate) navigator.vibrate(50);
    },

    navigateBack() {
        this._stopPlayerTimer();
        this._cancelHideTimer();
        const dest = this.state.currentDance || 'trilhas';
        this.navigate(dest);
    },

    /* ======================================================
       VIDEO PLAYER SIMULATION
       ====================================================== */
    _startPlayerTimer() {
        this._stopPlayerTimer(); // Clear any existing
        this._playerInterval = setInterval(() => {
            if (!this.state.playerPlaying) return;
            this.state.playerSeconds++;
            this._updatePlayerUI();

            // Show feedback popup 8 seconds after starting
            if (this.state.playerSeconds === 8 && !this.state.feedbackShown) {
                this.state.feedbackShown = true;
                setTimeout(() => this._showFeedback(), 300);
            }

            if (this.state.playerSeconds >= this.state.playerDuration) {
                this._stopPlayerTimer();
            }
        }, 1000);
    },

    _stopPlayerTimer() {
        if (this._playerInterval) { clearInterval(this._playerInterval); this._playerInterval = null; }
    },

    _updatePlayerUI() {
        const s   = this.state.playerSeconds;
        const dur = this.state.playerDuration;
        const pct = Math.min((s / dur) * 100, 100);
        const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2,'0')}`;

        const fill  = document.getElementById('player-fill');
        const thumb = document.getElementById('player-thumb');
        const curr  = document.getElementById('player-current');
        if (fill)  fill.style.width = `${pct}%`;
        if (thumb) thumb.style.left = `${pct}%`;
        if (curr)  curr.innerText   = fmt(s);
    },

    togglePlay() {
        this.state.playerPlaying = !this.state.playerPlaying;
        const icon   = document.querySelector('#main-play-btn .material-symbols-rounded');
        const bigIcon = document.querySelector('#play-pause-icon .material-symbols-rounded');
        const ppIcon  = document.getElementById('play-pause-icon');

        const sym = this.state.playerPlaying ? 'pause' : 'play_arrow';
        if (icon)    icon.innerText = sym;
        if (bigIcon) bigIcon.innerText = sym;

        // Flash the big center icon
        if (ppIcon) {
            ppIcon.classList.add('visible');
            setTimeout(() => ppIcon.classList.remove('visible'), 700);
        }
        this._showControls(); // reset hide timer on interaction
    },

    /* ======================================================
       CONTROLES AUTO-HIDE
       ====================================================== */
    handleVideoTap() {
        const now = Date.now();
        const ui  = document.getElementById('player-ui');
        const isVisible = ui && ui.classList.contains('controls-visible');

        if (isVisible) {
            // segundo toque rápido (< 400ms) = pause/play
            if (now - this.state.lastTapTime < 400) {
                this.togglePlay();
                return;
            }
            // controles já visíveis: esconde ou reinicia timer
            this._startHideTimer();
        } else {
            // controles ocultos: mostra
            this._showControls();
        }
        this.state.lastTapTime = now;
    },

    _showControls() {
        const ui = document.getElementById('player-ui');
        if (ui) ui.classList.add('controls-visible');
        this._startHideTimer();
    },

    _startHideTimer() {
        this._cancelHideTimer();
        this._hideTimer = setTimeout(() => {
            const ui = document.getElementById('player-ui');
            if (ui) ui.classList.remove('controls-visible');
        }, 3000);
    },

    _cancelHideTimer() {
        if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    },

    seekBack() {
        this.state.playerSeconds = Math.max(0, this.state.playerSeconds - 10);
        this._updatePlayerUI();
        this._showControls();
    },

    seekForward() {
        this.state.playerSeconds = Math.min(this.state.playerDuration, this.state.playerSeconds + 10);
        this._updatePlayerUI();
        this._showControls();
    },

    /* ======================================================
       DIFFICULTY FEEDBACK POPUP
       ====================================================== */
    _showFeedback() {
        const popup = document.getElementById('feedback-popup');
        if (popup) { popup.classList.add('show'); popup.setAttribute('aria-hidden', 'false'); }
    },

    closeFeedback() {
        const popup = document.getElementById('feedback-popup');
        if (popup) { popup.classList.remove('show'); popup.setAttribute('aria-hidden', 'true'); }
    },

    submitFeedback(isOk) {
        const msg = isOk
            ? 'Ótimo! Continuaremos recomendando este nível para você. 🎉'
            : 'Entendido! Vamos ajustar as sugestões para você. 👍';
        console.log('Feedback:', isOk ? 'OK' : 'NOT OK');
        this.closeFeedback();
        // Brief toast (replace emoji label)
        const tag = document.getElementById('video-dance-tag');
        if (tag) {
            const orig = tag.innerText;
            tag.innerText = isOk ? '✓ Obrigado!' : '✓ Anotado!';
            setTimeout(() => { tag.innerText = orig; }, 2500);
        }
    },

    finishLesson() {
        this._stopPlayerTimer();
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        this.state.minutesActive += 5;
        const statEl = document.getElementById('stat-minutes');
        if (statEl) statEl.innerText = this.state.minutesActive;

        const btn = document.querySelector('.btn-check');
        if (btn) btn.style.transform = 'scale(1.18)';
        setTimeout(() => {
            if (btn) btn.style.transform = '';
            this.navigateBack();
        }, 280);
    },

    /* ======================================================
       TRILHA TABS
       ====================================================== */
    switchTrilhaTab(tab) {
        ['quadrilha','xaxado'].forEach(t => {
            document.getElementById(`trilhas-${t}`).classList.toggle('hidden', t !== tab);
            document.getElementById(`ttab-${t}`).classList.toggle('active', t === tab);
        });
    },

    /* ======================================================
       QUICK LOGIN (demo account)
       ====================================================== */
    quickLogin() {
        const demo = this.state.users.find(u => u.email === 'ana@sertaodanca.com');
        if (demo) {
            this._loginSuccess(demo);
            this.navigate('profile');
        } else {
            this.openAuthModal('login');
        }
    },

    /* ======================================================
       SETTINGS
       ====================================================== */
    setQuality(value, btn) {
        document.querySelectorAll('.seg-control [id^="sq-"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const labels = { auto: 'Automático', '720p': 'Alta (720p)', '480p': 'Média (480p)', '360p': 'Econômico (360p)' };
        const lbl = document.getElementById('lbl-quality');
        if (lbl) lbl.innerText = labels[value] || value;
    },

    setFontSize(size, btn) {
        document.querySelectorAll('.seg-control [id^="sf-"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const labels = { small: 'Pequeno', normal: 'Normal', large: 'Grande' };
        const lbl = document.getElementById('lbl-font');
        if (lbl) lbl.innerText = labels[size] || size;
        // Apply to app container
        const sizes = { small: '14px', normal: '16px', large: '18px' };
        document.getElementById('app-container').style.fontSize = sizes[size] || '';
    },

    toggleSetting(key, btn) {
        const isActive = btn.classList.toggle('active');
        btn.setAttribute('aria-checked', String(isActive));
    },

    /* ======================================================
       VIDEO CONTROLS
       ====================================================== */
    toggleMirror() {
        this.state.isMirrored = !this.state.isMirrored;
        const video = document.getElementById('main-video');
        const btn   = document.getElementById('btn-mirror');
        video.classList.toggle('mirrored', this.state.isMirrored);
        btn.classList.toggle('active',     this.state.isMirrored);
        btn.setAttribute('aria-pressed', String(this.state.isMirrored));
        this._showControls();
    },

    toggleTips() {
        this.state.tipsOpen = !this.state.tipsOpen;
        const panel = document.getElementById('posture-tips');
        const btn   = document.getElementById('btn-tips');
        panel.classList.toggle('show', this.state.tipsOpen);
        panel.setAttribute('aria-hidden', String(!this.state.tipsOpen));
        btn.classList.toggle('active',    this.state.tipsOpen);
        btn.setAttribute('aria-pressed', String(this.state.tipsOpen));
        this._showControls();
    },

    /* ======================================================
       AUTH MODAL
       ====================================================== */
    openAuthModal(tab = 'login') {
        const modal = document.getElementById('auth-modal');
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        this.switchAuthTab(tab);
    },

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        this._clearAuthErrors();
    },

    switchAuthTab(tab) {
        document.getElementById('form-login').classList.toggle('hidden',    tab !== 'login');
        document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
        document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
        document.getElementById('tab-login').setAttribute('aria-selected',    String(tab === 'login'));
        document.getElementById('tab-register').setAttribute('aria-selected', String(tab === 'register'));
        this._clearAuthErrors();
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon  = btn.querySelector('.material-symbols-rounded');
        if (input.type === 'password') {
            input.type = 'text';
            icon.innerText = 'visibility_off';
        } else {
            input.type = 'password';
            icon.innerText = 'visibility';
        }
    },

    /* ======================================================
       AUTH LOGIC
       ====================================================== */
    _handleLogin() {
        const email    = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl  = document.getElementById('login-error');

        if (!email || !password) {
            errorEl.innerText = 'Preencha todos os campos.';
            return;
        }

        const found = this.state.users.find(u => u.email === email && u.password === password);
        if (!found) {
            errorEl.innerText = 'E-mail ou senha incorretos.';
            return;
        }

        this._loginSuccess(found);
    },

    _handleRegister() {
        const name     = document.getElementById('reg-name').value.trim();
        const email    = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;
        const errorEl  = document.getElementById('reg-error');

        if (!name || !email || !password) {
            errorEl.innerText = 'Preencha todos os campos.';
            return;
        }
        if (!email.includes('@')) {
            errorEl.innerText = 'Informe um e-mail válido.';
            return;
        }
        if (password.length < 6) {
            errorEl.innerText = 'A senha deve ter ao menos 6 caracteres.';
            return;
        }
        if (this.state.users.find(u => u.email === email)) {
            errorEl.innerText = 'Este e-mail já está cadastrado.';
            return;
        }

        const newUser = { name, email, password };
        this.state.users.push(newUser);
        localStorage.setItem('sertao_users', JSON.stringify(this.state.users));

        this._loginSuccess(newUser);
    },

    _loginSuccess(user) {
        this.state.user      = user;
        this.state.isLoggedIn = true;
        localStorage.setItem('sertao_user', JSON.stringify(user));
        this.closeAuthModal();
        this._syncProfileUI();
        // Reset form fields
        document.getElementById('form-login').reset();
        document.getElementById('form-register').reset();
    },

    logout() {
        this.state.user       = null;
        this.state.isLoggedIn = false;
        localStorage.removeItem('sertao_user');
        this._syncProfileUI();
    },

    quickEducatorLogin() {
        const prof = this.state.users.find(u => u.role === 'educator');
        if (prof) this._loginSuccess(prof);
    },

    /* ---- Keep profile UI in sync with auth state ---- */
    _syncProfileUI() {
        const guestEl    = document.getElementById('profile-guest');
        const loggedEl   = document.getElementById('profile-logged-in');
        const educatorEl = document.getElementById('profile-educator-in');
        const logoutBtn  = document.getElementById('btn-logout');
        const settingsBtn = document.getElementById('btn-settings');
        const headerEl   = document.getElementById('profile-header-title');

        if (this.state.isLoggedIn && this.state.user) {
            guestEl.style.display    = 'none';
            logoutBtn.style.display  = 'flex';
            if (settingsBtn) settingsBtn.style.display = 'flex';

            if (this.state.user.role === 'educator') {
                // Show Educator Dashboard
                if (loggedEl) loggedEl.style.display = 'none';
                if (educatorEl) educatorEl.style.display = 'flex';
                if (headerEl) headerEl.innerText = `Dashboard do Mestre`;
                
                const edName = document.getElementById('educator-display-name');
                const edEmail = document.getElementById('educator-display-email');
                if (edName) edName.innerText = this.state.user.name;
                if (edEmail) edEmail.innerText = this.state.user.email;
            } else {
                // Show Student Profile
                if (loggedEl) loggedEl.style.display = 'flex';
                if (educatorEl) educatorEl.style.display = 'none';
                if (headerEl) headerEl.innerText = `Olá, ${this.state.user.name.split(' ')[0]}! 👋`;
                
                const stuName = document.getElementById('user-display-name');
                const stuEmail = document.getElementById('user-display-email');
                if (stuName) stuName.innerText  = this.state.user.name;
                if (stuEmail) stuEmail.innerText = this.state.user.email;
            }
        } else {
            guestEl.style.display    = 'flex';
            if (loggedEl) loggedEl.style.display   = 'none';
            if (educatorEl) educatorEl.style.display = 'none';
            logoutBtn.style.display  = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';
            if (headerEl) headerEl.innerText = 'Meu Perfil';
        }
    },

    _clearAuthErrors() {
        document.getElementById('login-error').innerText = '';
        document.getElementById('reg-error').innerText   = '';
    },
};

/* ======================================================
   BOOTSTRAP
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => app.init());
