/* ====================================================
   SERTÃO DANÇA — app.js
   ==================================================== */

const app = {

    /* ---------- State ---------- */
    state: {
        currentView: 'landing',
        isMirrored: false,
        tipsOpen: false,
        minutesActive: 120,
        isLoggedIn: false,
        user: null,          // { name, email, password }
        users: [],            // simulated local "database"
    },

    curriculum: {
        quadrilha: [
            { title: 'Passo Básico da Quadrilha', duration: '4 min' },
            { title: 'Postura e Elegância', duration: '5 min' },
            { title: 'Anavantú e Anarriê', duration: '7 min' },
            { title: 'O Túnel e O Caracol', duration: '8 min' },
            { title: 'Coreografia Completa', duration: '12 min' }
        ],
        xaxado: [
            { title: 'Xaxado para Mobilidade', duration: '15 min' },
            { title: 'O Passo Arrastado', duration: '10 min' },
            { title: 'Sapateado e Marcação', duration: '12 min' },
            { title: 'Xaxado Avançado', duration: '20 min' }
        ]
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
        let anaUser = this.state.users.find(u => u.email === 'ana@sertaodanca.com');
        if (!anaUser || !anaUser.progress) {
            const simulatedProgress = {
                quadrilha: [
                    { title: 'Passo Básico da Quadrilha', stars: 5, date: new Date(Date.now() - 86400000 * 4).toISOString() },
                    { title: 'Postura e Elegância', stars: 4, date: new Date(Date.now() - 86400000 * 3).toISOString() },
                    { title: 'Anavantú e Anarriê', stars: 4, date: new Date(Date.now() - 86400000 * 2).toISOString() },
                    { title: 'O Túnel e O Caracol', stars: 3, date: new Date(Date.now() - 86400000 * 1).toISOString() }
                ],
                xaxado: [
                    { title: 'Xaxado para Mobilidade', stars: 4, date: new Date(Date.now() - 86400000 * 2).toISOString() },
                    { title: 'O Passo Arrastado', stars: 3, date: new Date(Date.now() - 86400000 * 1).toISOString() }
                ]
            };
            if (!anaUser) {
                anaUser = { name: 'Ana Paula Souza', email: 'ana@sertaodanca.com', password: 'demo123', role: 'student', progress: simulatedProgress };
                this.state.users.push(anaUser);
            } else {
                anaUser.progress = simulatedProgress;
            }
            localStorage.setItem('sertao_users', JSON.stringify(this.state.users));

            // Update active session if she is currently logged in
            const activeUser = localStorage.getItem('sertao_user');
            if (activeUser) {
                const parsed = JSON.parse(activeUser);
                if (parsed.email === 'ana@sertaodanca.com') {
                    parsed.progress = simulatedProgress;
                    localStorage.setItem('sertao_user', JSON.stringify(parsed));
                }
            }
        }
        if (!this.state.users.find(u => u.email === 'prof@sertaodanca.com')) {
            this.state.users.push({ name: 'Prof. Mestre Vitalino', email: 'prof@sertaodanca.com', password: 'admin123', role: 'educator' });
            localStorage.setItem('sertao_users', JSON.stringify(this.state.users));
        }

        // Restore session from localStorage
        const saved = localStorage.getItem('sertao_user');
        if (saved) {
            const user = JSON.parse(saved);
            this.state.user = user;
            this.state.isLoggedIn = true;
        }

        this._syncProfileUI();
        this._updateNav('landing');

        // Bind modal forms
        const formLogin = document.getElementById('form-login');
        if (formLogin) formLogin.addEventListener('submit', e => { e.preventDefault(); this._handleLogin(); });

        const formRegister = document.getElementById('form-register');
        if (formRegister) formRegister.addEventListener('submit', e => { e.preventDefault(); this._handleRegister(); });

        // Close modal on backdrop click
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.addEventListener('click', e => {
                if (e.target === authModal) this.closeAuthModal();
            });
        }



        console.log('Brasil em Movimento v2 initialized.');
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

        if (viewId === 'trophies') {
            document.querySelectorAll('.trophy-card-viewer').forEach(container => {
                const viewer = container.querySelector('model-viewer');
                const type = container.getAttribute('data-trophy-color');
                if (viewer && type) this._applyTrophyColor(viewer, type);
            });
        }
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
        this.state.currentDance = dance;
        this.state.lessonTitle = title;
        this.state.playerSeconds = 0;
        this.state.playerPlaying = true;
        this.state.feedbackShown = false;
        this.state.lastTapTime = 0;

        // Update player UI
        document.getElementById('current-lesson-title').innerText = title;
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
        const s = this.state.playerSeconds;
        const dur = this.state.playerDuration;
        const pct = Math.min((s / dur) * 100, 100);
        const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

        const fill = document.getElementById('player-fill');
        const thumb = document.getElementById('player-thumb');
        const curr = document.getElementById('player-current');
        if (fill) fill.style.width = `${pct}%`;
        if (thumb) thumb.style.left = `${pct}%`;
        if (curr) curr.innerText = fmt(s);
    },

    togglePlay() {
        this.state.playerPlaying = !this.state.playerPlaying;
        const icon = document.querySelector('#main-play-btn .material-symbols-rounded');
        const bigIcon = document.querySelector('#play-pause-icon .material-symbols-rounded');
        const ppIcon = document.getElementById('play-pause-icon');

        const sym = this.state.playerPlaying ? 'pause' : 'play_arrow';
        if (icon) icon.innerText = sym;
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
        const ui = document.getElementById('player-ui');
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
       FITNESS FEEDBACK MODAL (POST-LESSON)
       ====================================================== */
    openFitnessFeedback() {
        this._stopPlayerTimer();
        if (navigator.vibrate) navigator.vibrate([40, 20, 40]);

        const modal = document.getElementById('fitness-modal');
        const warn = document.getElementById('fitness-guest-warning');
        if (warn) {
            warn.style.display = this.state.isLoggedIn ? 'none' : 'flex';
        }

        // Reset stars
        this.state.currentFitnessRating = 0;
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('fitness-label').innerText = 'Selecione uma opção';
        document.getElementById('fitness-desc').innerText = 'Clique nas estrelas acima para avaliar sua execução.';
        document.getElementById('btn-fitness-submit').disabled = true;

        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }
    },

    closeFitnessFeedback() {
        const modal = document.getElementById('fitness-modal');
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    rateFitness(stars) {
        this.state.currentFitnessRating = stars;
        document.querySelectorAll('.star-btn').forEach(btn => {
            const val = parseInt(btn.getAttribute('data-val'));
            btn.classList.toggle('active', val <= stars);
        });

        const labels = {
            1: { title: 'Apenas assisti', desc: 'Entendi a coreografia visualmente, mas ainda não executei.' },
            2: { title: 'Tentei seguir', desc: 'Tentei executar, mas com forte dependência do vídeo.' },
            3: { title: 'Acompanhei', desc: 'Consigo executar espelhando o vídeo em tempo real.' },
            4: { title: 'Quase lá', desc: 'Execução fluida, poucas consultas ao vídeo.' },
            5: { title: 'Dominei!', desc: 'Domínio total! Executo com autonomia e ritmo.' }
        };

        document.getElementById('fitness-label').innerText = labels[stars].title;
        document.getElementById('fitness-desc').innerText = labels[stars].desc;
        document.getElementById('btn-fitness-submit').disabled = false;

        if (navigator.vibrate) navigator.vibrate(20);
    },

    submitFitnessFeedback() {
        if (!this.state.currentFitnessRating) return;

        if (this.state.isLoggedIn && this.state.user) {
            if (!this.state.user.progress) this.state.user.progress = { quadrilha: [], xaxado: [] };
            const dance = this.state.currentDance || 'quadrilha';

            // Save progress
            this.state.user.progress[dance].push({
                title: this.state.lessonTitle,
                stars: this.state.currentFitnessRating,
                date: new Date().toISOString()
            });

            // Sync to local storage
            const idx = this.state.users.findIndex(u => u.email === this.state.user.email);
            if (idx > -1) {
                this.state.users[idx] = this.state.user;
                localStorage.setItem('sertao_users', JSON.stringify(this.state.users));
                localStorage.setItem('sertao_user', JSON.stringify(this.state.user));
            }
        }

        // Also do standard finish logic
        this.state.minutesActive += 5;
        const statEl = document.getElementById('stat-minutes');
        if (statEl) statEl.innerText = this.state.minutesActive;

        this.closeFitnessFeedback();
        this.navigateBack();
    },

    openHistory(danceFilter) {
        this.navigate('history');
        const container = document.getElementById('history-container');
        container.innerHTML = '';

        if (!this.state.isLoggedIn || !this.state.user || !this.state.user.progress) {
            container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-light);"><span class="material-symbols-rounded" style="font-size:48px; opacity:0.5; margin-bottom:12px; display:block;">history</span><p>Faça login para ver o seu currículo e salvar as avaliações.</p></div>`;
            return;
        }

        const progress = this.state.user.progress;

        const renderCurriculum = (danceKey, title) => {
            const lessons = this.curriculum[danceKey];
            if (!lessons) return '';

            let html = `<h3 style="margin-bottom: 12px; font-size: 1.1rem; color: var(--primary); text-transform: capitalize;">${title}</h3><div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">`;

            const userProgress = progress[danceKey] || [];
            const unlockedCount = userProgress.length;

            lessons.forEach((lesson, index) => {
                const evalData = userProgress.find(p => p.title === lesson.title);

                let iconHtml = '';
                let sideHtml = '';
                let opacity = '1';

                if (evalData) {
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += `<span class="material-symbols-rounded" style="font-size:16px; color:${i <= evalData.stars ? '#FFB300' : '#e0e0e0'}; font-variation-settings: 'FILL' 1;">star</span>`;
                    }
                    const dateStr = new Date(evalData.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                    iconHtml = `<span class="material-symbols-rounded" style="color: #4caf50;">check_circle</span>`;
                    sideHtml = `<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                    <div style="display: flex; gap: 2px;">${starsHtml}</div>
                                    <span style="font-size: 0.75rem; color: var(--text-light);">${dateStr}</span>
                                </div>`;
                } else if (index <= unlockedCount) {
                    iconHtml = `<span class="material-symbols-rounded" style="color: var(--primary);">play_circle</span>`;
                    sideHtml = `<span style="font-size: 0.75rem; color: var(--text-light); padding: 4px 8px; background: #eee; border-radius: 12px;">Pendente</span>`;
                } else {
                    opacity = '0.6';
                    iconHtml = `<span class="material-symbols-rounded" style="color: var(--text-light);">lock</span>`;
                    sideHtml = `<span style="font-size: 0.75rem; color: var(--text-light);">Bloqueado</span>`;
                }

                html += `
                    <div style="background: var(--bg-card); padding: 16px; border-radius: var(--radius); box-shadow: var(--shadow-sm); display: flex; justify-content: space-between; align-items: center; opacity: ${opacity};">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; padding-right: 12px;">
                            ${iconHtml}
                            <div>
                                <h4 style="font-size: 0.95rem; margin-bottom: 2px; line-height: 1.3;">${lesson.title}</h4>
                                <span style="font-size: 0.75rem; color: var(--text-light);">${lesson.duration}</span>
                            </div>
                        </div>
                        ${sideHtml}
                    </div>
                `;
            });
            html += `</div>`;
            return html;
        };

        if (danceFilter) {
            container.innerHTML += renderCurriculum(danceFilter, danceFilter);
        } else {
            container.innerHTML += renderCurriculum('quadrilha', 'Quadrilha');
            container.innerHTML += renderCurriculum('xaxado', 'Xaxado');
        }
    },

    _applyTrophyColor(viewer, type) {
        let color = null; // RGBA
        if (type === 'bronze') color = [0.8, 0.45, 0.15, 1];
        else if (type === 'gold') color = [1.0, 0.84, 0.0, 1];
        else if (type === 'platinum') color = [0.85, 0.85, 0.9, 1];

        const applyColor = () => {
            if (viewer && viewer.model && viewer.model.materials) {
                viewer.model.materials.forEach(mat => {
                    if (mat.pbrMetallicRoughness) {
                        mat.pbrMetallicRoughness.setBaseColorFactor(color);
                        mat.pbrMetallicRoughness.setRoughnessFactor(0.2);
                        mat.pbrMetallicRoughness.setMetallicFactor(1.0);
                    }
                });
            }
        };

        if (viewer.model) applyColor();
        else viewer.addEventListener('load', applyColor, { once: true });
    },

    openTrophyInspection(type, isLocked = false, danceName = '') {
        const modal = document.getElementById('trophy-inspection-modal');
        const viewer = document.getElementById('fullscreen-trophy-viewer');
        const titleEl = document.getElementById('fs-trophy-title');
        const descEl = document.getElementById('fs-trophy-desc');

        let title = '';
        let desc = '';

        if (type === 'bronze') {
            title = 'Troféu Bronze';
            desc = 'Como conquistar: Chegue até a metade do curso da dança.';
        } else if (type === 'gold') {
            title = 'Troféu Ouro';
            desc = 'Como conquistar: Consiga finalizar com até 3 estrelas.';
        } else if (type === 'platinum') {
            title = 'Troféu Platina';
            desc = 'Como conquistar: Conquiste 5 estrelas em todas as aulas.';
        }

        if (titleEl) {
            let extraInfo = '';
            if (danceName) extraInfo += ` <span style="font-size: 0.7em; opacity: 0.8;">(${danceName})</span>`;
            if (isLocked) extraInfo += ` <span class="material-symbols-rounded" style="font-size: 20px; vertical-align: text-bottom; color: #ffcc00;" title="Bloqueado">lock</span>`;
            titleEl.innerHTML = title + extraInfo;
        }
        if (descEl) descEl.innerText = desc;

        if (viewer) this._applyTrophyColor(viewer, type);

        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }
    },

    closeTrophyInspection() {
        const modal = document.getElementById('trophy-inspection-modal');
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    /* ======================================================
       TRILHA TABS
       ====================================================== */
    switchTrilhaTab(tab) {
        ['quadrilha', 'xaxado'].forEach(t => {
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
        const btn = document.getElementById('btn-mirror');
        video.classList.toggle('mirrored', this.state.isMirrored);
        btn.classList.toggle('active', this.state.isMirrored);
        btn.setAttribute('aria-pressed', String(this.state.isMirrored));
        this._showControls();
    },

    toggleTips() {
        this.state.tipsOpen = !this.state.tipsOpen;
        const panel = document.getElementById('posture-tips');
        const btn = document.getElementById('btn-tips');
        panel.classList.toggle('show', this.state.tipsOpen);
        panel.setAttribute('aria-hidden', String(!this.state.tipsOpen));
        btn.classList.toggle('active', this.state.tipsOpen);
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
        document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
        document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
        document.getElementById('tab-login').classList.toggle('active', tab === 'login');
        document.getElementById('tab-register').classList.toggle('active', tab === 'register');
        document.getElementById('tab-login').setAttribute('aria-selected', String(tab === 'login'));
        document.getElementById('tab-register').setAttribute('aria-selected', String(tab === 'register'));
        this._clearAuthErrors();
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('.material-symbols-rounded');
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
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

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
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const password = document.getElementById('reg-password').value;
        const errorEl = document.getElementById('reg-error');

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
        this.state.user = user;
        this.state.isLoggedIn = true;
        localStorage.setItem('sertao_user', JSON.stringify(user));
        this.closeAuthModal();
        this._syncProfileUI();
        // Reset form fields
        document.getElementById('form-login').reset();
        document.getElementById('form-register').reset();
    },

    logout() {
        this.state.user = null;
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
        const guestEl = document.getElementById('profile-guest');
        const loggedEl = document.getElementById('profile-logged-in');
        const educatorEl = document.getElementById('profile-educator-in');
        const logoutBtn = document.getElementById('btn-logout');
        const settingsBtn = document.getElementById('btn-settings');
        const headerEl = document.getElementById('profile-header-title');

        if (this.state.isLoggedIn && this.state.user) {
            guestEl.style.display = 'none';
            logoutBtn.style.display = 'flex';
            if (settingsBtn) settingsBtn.style.display = 'flex';

            if (this.state.user.role === 'educator') {
                if (loggedEl) loggedEl.style.display = 'none';
                if (educatorEl) educatorEl.style.display = 'flex';
                if (headerEl) headerEl.innerText = `Dashboard do Mestre`;

                const edName = document.getElementById('educator-display-name');
                const edEmail = document.getElementById('educator-display-email');
                if (edName) edName.innerText = this.state.user.name;
                if (edEmail) edEmail.innerText = this.state.user.email;
            } else {
                if (loggedEl) loggedEl.style.display = 'flex';
                if (educatorEl) educatorEl.style.display = 'none';
                if (headerEl) headerEl.innerText = `Olá, ${this.state.user.name.split(' ')[0]}! 👋`;

                const stuName = document.getElementById('user-display-name');
                const stuEmail = document.getElementById('user-display-email');
                if (stuName) stuName.innerText = this.state.user.name;
                if (stuEmail) stuEmail.innerText = this.state.user.email;

                // Dynamic Progress Update
                const updateDanceProgress = (id) => {
                    const doneCount = (this.state.user.progress && this.state.user.progress[id]) ? this.state.user.progress[id].length : 0;
                    const totalCount = this.curriculum[id].length;
                    const pct = Math.round((doneCount / totalCount) * 100);

                    const pctEl = document.getElementById(`pct-${id}`);
                    const barEl = document.getElementById(`bar-${id}`);
                    const trophiesContainer = document.getElementById(`trophies-${id}`);

                    if (pctEl) pctEl.innerText = `${pct}%`;
                    if (barEl) {
                        barEl.style.width = `${pct}%`;
                        barEl.parentElement.setAttribute('aria-valuenow', pct);
                    }

                    // Update trophy icons based on thresholds
                    if (trophiesContainer) {
                        const tBronze = trophiesContainer.querySelector('.trophy-bronze');
                        const tGold = trophiesContainer.querySelector('.trophy-gold');
                        const tPlatinum = trophiesContainer.querySelector('.trophy-platinum');

                        if (tBronze) tBronze.classList.toggle('earned', pct >= 20);
                        if (tBronze) tBronze.classList.toggle('locked', pct < 20);

                        if (tGold) tGold.classList.toggle('earned', pct >= 60);
                        if (tGold) tGold.classList.toggle('locked', pct < 60);

                        if (tPlatinum) tPlatinum.classList.toggle('earned', pct >= 90);
                        if (tPlatinum) tPlatinum.classList.toggle('locked', pct < 90);

                        // Update container title for accessibility
                        let nextT = 'Bronze';
                        if (pct >= 90) nextT = 'Platina (Completo)';
                        else if (pct >= 60) nextT = 'Platina';
                        else if (pct >= 20) nextT = 'Ouro';
                        trophiesContainer.title = `Troféu ${nextT} (Progresso: ${pct}%)`;
                    }
                };

                updateDanceProgress('quadrilha');
                updateDanceProgress('xaxado');
            }
        } else {
            guestEl.style.display = 'flex';
            if (loggedEl) loggedEl.style.display = 'none';
            if (educatorEl) educatorEl.style.display = 'none';
            logoutBtn.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'none';
            if (headerEl) headerEl.innerText = 'Meu Perfil';
        }
    },

    _clearAuthErrors() {
        document.getElementById('login-error').innerText = '';
        document.getElementById('reg-error').innerText = '';
    },
};

/* ======================================================
   BOOTSTRAP
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => app.init());
