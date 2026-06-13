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
        videoQuality: 'auto',
        qualityPanelOpen: false,
    },

    curriculum: {
        steps: [
            { id: '01', title: 'Marcação Básica', desc: 'Introdução e ritmo' },
            { id: '02', title: 'Caminhada e Deslocamento', desc: 'Movimentos pelo salão' },
            { id: '03', title: 'Giro Simples', desc: 'Noções de eixo e rotação' },
            { id: '04', title: 'Abertura e Lateral', desc: 'Exploração do espaço' },
            { id: '05', title: 'Giro Complexo', desc: 'Variações e dinâmicas' },
            { id: '06', title: 'Coreografia', desc: 'Encadeamento dos passos' }
        ],
        levels: [
            { id: 'A', name: 'Básico', icon: 'play_circle' },
            { id: 'B', name: 'Intermediário', icon: 'play_circle' },
            { id: 'C', name: 'Avançado', icon: 'play_circle' }
        ],
        roles: {
            'cavalheiro': { prefix: 'C', name: 'Cavalheiro' },
            'dama': { prefix: 'D', name: 'Dama' },
            'casal': { prefix: 'CASAL', name: 'Casal' }
        }
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
            // Quick demo login setup
            let anaUser = this.state.users.find(u => u.email === 'ana@sertaodanca.com');
            if (!anaUser) {
                anaUser = { name: 'Ana Paula Souza', email: 'ana@sertaodanca.com', password: 'demo123', role: 'student', progress: {} };
                this.state.users.push(anaUser);
            } else {
                anaUser.progress = {}; // Wipe mock data
            }
            localStorage.setItem('sertao_users', JSON.stringify(this.state.users));

            // Update active session if she is currently logged in
            const activeUser = localStorage.getItem('sertao_user');
            if (activeUser) {
                const parsed = JSON.parse(activeUser);
                if (parsed.email === 'ana@sertaodanca.com') {
                    parsed.progress = {}; // Wipe mock data
                    localStorage.setItem('sertao_user', JSON.stringify(parsed));
                    if (this.state.user && this.state.user.email === 'ana@sertaodanca.com') {
                        this.state.user.progress = {};
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

        // Restore video quality preference
        const savedQuality = localStorage.getItem('sertao_quality');
        if (savedQuality) this.state.videoQuality = savedQuality;

        this._syncProfileUI();
        this._initTheme();
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



        this.switchTrilhaTab('cavalheiro');
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
    startLesson(title, videoFile, roleName = 'Prática') {
        this.state.currentDance = roleName;
        this.state.lessonTitle = title;
        this.state.currentVideoFile = videoFile;
        this.state.playerSeconds = 0;
        this.state.playerPlaying = true;
        this.state.feedbackShown = false;
        this.state.lastTapTime = 0;

        // Update player UI text
        document.getElementById('current-lesson-title').innerText = title;
        document.getElementById('video-lesson-top-title').innerText = title;
        document.getElementById('video-dance-tag').innerText = roleName;
        document.getElementById('current-lesson-sub').innerText = 'Duração flexível';

        // Load real video
        this._loadVideo(title, videoFile);

        this.navigate('experience');
        this._showControls();
        if (navigator.vibrate) navigator.vibrate(50);
    },

    navigateBack() {
        this._stopPlayerTimer();
        this._cancelHideTimer();
        const video = document.getElementById('main-video');
        if (video) { video.pause(); video.currentTime = 0; }
        // Close quality panel if open
        if (this.state.qualityPanelOpen) this.toggleQualityPanel();
        
        let dest = 'home';
        if (this.state.currentView === 'experience') dest = 'trilhas';
        else if (this.state.currentView === 'quadrilha' || this.state.currentView === 'xaxado') dest = 'home';
        else if (this.state.currentView === 'history') dest = 'profile';
        
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
        const video = document.getElementById('main-video');
        const icon = document.querySelector('#main-play-btn .material-symbols-rounded');
        const bigIcon = document.querySelector('#play-pause-icon .material-symbols-rounded');
        const ppIcon = document.getElementById('play-pause-icon');

        if (video && (video.src || video.currentSrc || this.state.currentVideoFile)) {
            // Real video control
            if (video.paused || video.ended) {
                if (video.ended) video.currentTime = 0;
                video.play();
                this.state.playerPlaying = true;
            } else {
                video.pause();
                this.state.playerPlaying = false;
            }
        } else {
            // Simulated fallback
            this.state.playerPlaying = !this.state.playerPlaying;
        }

        const sym = this.state.playerPlaying ? 'pause' : 'play_arrow';
        if (icon) icon.innerText = sym;
        if (bigIcon) bigIcon.innerText = sym;

        if (ppIcon) {
            ppIcon.classList.add('visible');
            setTimeout(() => ppIcon.classList.remove('visible'), 700);
        }
        this._showControls();
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
        const video = document.getElementById('main-video');
        if (video && video.readyState > 0) {
            video.currentTime = Math.max(0, video.currentTime - 10);
        } else {
            this.state.playerSeconds = Math.max(0, this.state.playerSeconds - 10);
            this._updatePlayerUI();
        }
        this._showControls();
    },

    seekForward() {
        const video = document.getElementById('main-video');
        if (video && video.readyState > 0) {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
        } else {
            this.state.playerSeconds = Math.min(this.state.playerDuration, this.state.playerSeconds + 10);
            this._updatePlayerUI();
        }
        this._showControls();
    },

    /* ======================================================
       VIDEO SOURCE MANAGEMENT
       ====================================================== */
    _loadVideo(title, videoFile) {
        const video = document.getElementById('main-video');
        const source = document.getElementById('video-source');
        if (!video || !source) return;

        const filename = videoFile || this.state.currentVideoFile;
        if (!filename) {
            console.warn('No video mapped for:', title);
            // Fallback: keep poster image, run simulated timer
            video.removeAttribute('src');
            source.removeAttribute('src');
            this.state.playerDuration = 300;
            document.getElementById('player-total').innerText = '5:00';
            this._startPlayerTimer();
            return;
        }

        const quality = this.state.videoQuality === 'auto' ? '720p' : this.state.videoQuality;
        const videoPath = `videos/${quality}/${filename}`;

        source.src = videoPath;
        video.load();

        video.onloadedmetadata = () => {
            this.state.playerDuration = Math.floor(video.duration);
            const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
            document.getElementById('player-total').innerText = fmt(this.state.playerDuration);
        };

        video.ontimeupdate = () => {
            if (!video.duration) return;
            this.state.playerSeconds = Math.floor(video.currentTime);
            const pct = (video.currentTime / video.duration) * 100;
            const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
            const fill = document.getElementById('player-fill');
            const thumb = document.getElementById('player-thumb');
            const curr = document.getElementById('player-current');
            if (fill) fill.style.width = `${pct}%`;
            if (thumb) thumb.style.left = `${pct}%`;
            if (curr) curr.innerText = fmt(Math.floor(video.currentTime));

            // Show feedback popup at 8 seconds
            if (Math.floor(video.currentTime) === 8 && !this.state.feedbackShown) {
                this.state.feedbackShown = true;
                setTimeout(() => this._showFeedback(), 300);
            }
        };

        video.onended = () => {
            if (!video.loop) {
                video.currentTime = 0;
                video.pause();
            }
            this.state.playerPlaying = false;
            const icon = document.querySelector('#main-play-btn .material-symbols-rounded');
            if (icon) icon.innerText = 'play_arrow';
        };

        video.onerror = () => {
            console.warn('Video not found at:', videoPath, '— using simulated player.');
            this.state.playerDuration = 300;
            document.getElementById('player-total').innerText = '5:00';
            this._startPlayerTimer();
        };

        video.play().catch(() => {
            console.log('Autoplay blocked, user must tap play.');
            this.state.playerPlaying = false;
            const icon = document.querySelector('#main-play-btn .material-symbols-rounded');
            if (icon) icon.innerText = 'play_arrow';
        });
    },

    /* ======================================================
       QUALITY PANEL
       ====================================================== */
    toggleQualityPanel() {
        this.state.qualityPanelOpen = !this.state.qualityPanelOpen;
        const panel = document.getElementById('quality-panel');
        const btn = document.getElementById('btn-quality');
        if (panel) {
            panel.classList.toggle('show', this.state.qualityPanelOpen);
            panel.setAttribute('aria-hidden', String(!this.state.qualityPanelOpen));
        }
        if (btn) {
            btn.classList.toggle('active', this.state.qualityPanelOpen);
            btn.setAttribute('aria-pressed', String(this.state.qualityPanelOpen));
        }
        // Close tips if open
        if (this.state.qualityPanelOpen && this.state.tipsOpen) {
            this.toggleTips();
        }
        this._showControls();
    },

    setVideoQuality(quality) {
        this.state.videoQuality = quality;
        localStorage.setItem('sertao_quality', quality);

        // Update active state in panel
        document.querySelectorAll('.quality-opt').forEach(opt => {
            const isActive = opt.getAttribute('data-quality') === quality;
            opt.classList.toggle('active', isActive);
            opt.setAttribute('aria-checked', String(isActive));
        });

        // If a video is currently playing, reload with new quality
        const video = document.getElementById('main-video');
        if (video && this.state.lessonTitle && video.currentTime > 0) {
            const currentTime = video.currentTime;
            const wasPlaying = !video.paused;
            this._loadVideo(this.state.lessonTitle, this.state.currentVideoFile);
            video.onloadedmetadata = () => {
                video.currentTime = currentTime;
                if (wasPlaying) video.play();
                this.state.playerDuration = Math.floor(video.duration);
                const fmt = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
                document.getElementById('player-total').innerText = fmt(this.state.playerDuration);
            };
        }

        // Close panel after selection
        setTimeout(() => {
            this.state.qualityPanelOpen = false;
            const panel = document.getElementById('quality-panel');
            const btn = document.getElementById('btn-quality');
            if (panel) { panel.classList.remove('show'); panel.setAttribute('aria-hidden', 'true'); }
            if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
        }, 300);
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
        const v = document.getElementById('main-video');
        if (v && !v.paused) this.togglePlay();
        
        if (navigator.vibrate) navigator.vibrate([40, 20, 40]);

        const modal = document.getElementById('fitness-modal');
        const warn = document.getElementById('fitness-guest-warning');
        if (warn) {
            warn.style.display = this.state.isLoggedIn ? 'none' : 'flex';
        }

        // Reset Steps UI
        const step1 = document.getElementById('fitness-step-eval');
        const step2 = document.getElementById('fitness-step-share');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';

        // Reset Diff UI
        this.state.currentDifficulty = null;
        document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('active', 'selected'));

        // Reset stars
        this.state.currentFitnessRating = 0;
        document.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('fitness-label').innerText = 'Selecione as estrelas';
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
        this.navigateBack();
    },

    continueFromFeedback() {
        this.closeFitnessFeedback();
    },

    rateDifficulty(isAdequate) {
        this.state.currentDifficulty = isAdequate;
        const btnYes = document.getElementById('btn-diff-yes');
        const btnNo = document.getElementById('btn-diff-no');
        if (btnYes && btnNo) {
            btnYes.classList.toggle('selected', isAdequate === true);
            btnNo.classList.toggle('selected', isAdequate === false);
        }
        this._checkFitnessSubmit();
    },

    rateFitness(stars) {
        this.state.currentFitnessRating = stars;
        document.querySelectorAll('.star-btn').forEach(btn => {
            const val = parseInt(btn.getAttribute('data-val'));
            btn.classList.toggle('active', val <= stars);
        });

        const labels = {
            1: { title: 'Apenas assisti', desc: 'Apenas visualização.' },
            2: { title: 'Tentei seguir', desc: 'Forte dependência do vídeo.' },
            3: { title: 'Acompanhei', desc: 'Consigo executar espelhando o vídeo.' },
            4: { title: 'Quase lá', desc: 'Execução fluida, poucas consultas.' },
            5: { title: 'Dominei!', desc: 'Executo com autonomia total.' }
        };

        const labelEl = document.getElementById('fitness-label');
        if (labelEl) {
            labelEl.innerHTML = `<strong>${labels[stars].title}</strong> - ${labels[stars].desc}`;
        }
        
        if (navigator.vibrate) navigator.vibrate(20);
        this._checkFitnessSubmit();
    },

    _checkFitnessSubmit() {
        const btn = document.getElementById('btn-fitness-submit');
        if (btn) {
            btn.disabled = !(this.state.currentFitnessRating > 0 && this.state.currentDifficulty !== null);
        }
    },

    submitFitnessFeedback() {
        if (!this.state.currentFitnessRating || this.state.currentDifficulty === null) return;

        if (this.state.isLoggedIn && this.state.user) {
            if (!this.state.user.progress) this.state.user.progress = {};
            const dance = this.state.currentDance || 'Casal';
            
            if (!this.state.user.progress[dance]) {
                this.state.user.progress[dance] = [];
            }

            const existingIdx = this.state.user.progress[dance].findIndex(l => l.title === this.state.lessonTitle);
            if (existingIdx !== -1) {
                // Sempre atualiza o feedback mais recente
                this.state.user.progress[dance][existingIdx].stars = this.state.currentFitnessRating;
                this.state.user.progress[dance][existingIdx].difficultyAdequate = this.state.currentDifficulty;
                this.state.user.progress[dance][existingIdx].date = new Date().toISOString();
            } else {
                this.state.user.progress[dance].push({
                    title: this.state.lessonTitle,
                    stars: this.state.currentFitnessRating,
                    difficultyAdequate: this.state.currentDifficulty,
                    date: new Date().toISOString()
                });
            }

            const idx = this.state.users.findIndex(u => u.email === this.state.user.email);
            if (idx > -1) {
                this.state.users[idx] = this.state.user;
                localStorage.setItem('sertao_users', JSON.stringify(this.state.users));
                localStorage.setItem('sertao_user', JSON.stringify(this.state.user));
            }
        }

        // Update UI logic
        this.renderTrilhas(this.state.currentTrilhaTab || 'casal');
        this.updateHomeResumeCard();
        this._syncProfileUI();

        // Switch to Share Step
        const step1 = document.getElementById('fitness-step-eval');
        const step2 = document.getElementById('fitness-step-share');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
    },

    shareProgress() {
        // Log achievement
        if (this.state.isLoggedIn && this.state.user) {
            if (!this.state.user.achievements) this.state.user.achievements = {};
            this.state.user.achievements.sharedFirstTime = true;
            localStorage.setItem('sertao_user', JSON.stringify(this.state.user));
        }

        const shareText = `Acabei de concluir a aula '${this.state.lessonTitle}' no app Brasil em Movimento! Vem dançar também!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Brasil em Movimento',
                text: shareText,
                url: window.location.href
            }).then(() => {
                this.continueFromFeedback();
            }).catch(e => {
                // Ignore cancel errors
                this.continueFromFeedback();
            });
        } else {
            // Fallback
            alert('Progresso salvo para compartilhar!');
            this.continueFromFeedback();
        }
    },

    openHistory(danceFilter) {
        this.navigate('history');
        const container = document.getElementById('history-container');
        container.innerHTML = '';

        if (!this.state.isLoggedIn || !this.state.user || !this.state.user.progress) {
            container.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-light);"><i  class="ti ti-history" style="font-size:48px; opacity:0.5; margin-bottom:12px; display:block;"></i><p>Faça login para ver o seu currículo e salvar as avaliações.</p></div>`;
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
                        starsHtml += `<i  class="ti ti-star-filled" style="font-size:16px; color:${i <= evalData.stars ? '#FFB300' : '#e0e0e0'}; font-variation-settings: 'FILL' 1;"></i>`;
                    }
                    const dateStr = new Date(evalData.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                    iconHtml = `<i  class="ti ti-circle-check-filled" style="color: #4caf50;"></i>`;
                    sideHtml = `<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                    <div style="display: flex; gap: 2px;">${starsHtml}</div>
                                    <span style="font-size: 0.75rem; color: var(--text-light);">${dateStr}</span>
                                </div>`;
                } else if (index <= unlockedCount) {
                    iconHtml = `<i  class="ti ti-play-circle" style="color: var(--primary);"></i>`;
                    sideHtml = `<span style="font-size: 0.75rem; color: var(--text-light); padding: 4px 8px; background: #eee; border-radius: 12px;">Pendente</span>`;
                } else {
                    opacity = '0.6';
                    iconHtml = `<i  class="ti ti-lock" style="color: var(--text-light);"></i>`;
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
            if (isLocked) extraInfo += ` <i  class="ti ti-lock" style="font-size: 20px; vertical-align: text-bottom; color: #ffcc00;" title="Bloqueado"></i>`;
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
        ['cavalheiro', 'dama', 'casal'].forEach(t => {
            const btn = document.getElementById(`ttab-${t}`);
            if (btn) btn.classList.toggle('active', t === tab);
        });
        this.renderTrilhas(tab);
    },

    renderTrilhas(tab) {
        const container = document.getElementById('trilhas-container');
        if (!container) return;
        
        const role = this.curriculum.roles[tab];
        if(!role) return;

        let html = '';

        this.curriculum.steps.forEach((step, idx) => {
            // Determine if this step is unlocked
            let isUnlocked = idx === 0; // Step 1 is always unlocked
            
            if (idx > 0) {
                const prevStep = this.curriculum.steps[idx - 1];
                const prevStepTitles = this.curriculum.levels.map(l => `${prevStep.title} - ${l.name}`);
                const roleProgress = this.state.user?.progress?.[role.name] || [];
                const hasEvaluatedPrev = roleProgress.some(p => prevStepTitles.includes(p.title) && p.stars > 0);
                isUnlocked = hasEvaluatedPrev;
            }

            // Determine if step is fully completed (all 3 levels evaluated) or just active
            const currentStepTitles = this.curriculum.levels.map(l => `${step.title} - ${l.name}`);
            const roleProgress = this.state.user?.progress?.[role.name] || [];
            const evaluatedCount = currentStepTitles.filter(title => roleProgress.some(p => p.title === title)).length;
            
            const isCompleted = evaluatedCount === 3;
            const isActive = isUnlocked && !isCompleted;
            
            const badgeClass = isCompleted ? 'module-badge--done' : (isActive ? 'module-badge--active' : '');
            const badgeIcon = isCompleted ? 'check' : (isActive ? 'play_arrow' : 'lock');
            const borderClass = isCompleted ? 'trilha-completed' : (isActive ? 'active-module' : '');
            const pct = isUnlocked ? Math.floor(evaluatedCount / 3 * 100) + '%' : '0%';
            const pctNum = isUnlocked ? Math.floor(evaluatedCount / 3 * 100) : 0;

            let lessonsHtml = '';
            this.curriculum.levels.forEach((level, lidx) => {
                const lessonTitle = `${step.title} - ${level.name}`;
                const videoFile = `${role.prefix}-${step.id}-${level.id}.mp4`;
                const isLocked = !isUnlocked;
                
                // Check if this specific lesson was evaluated
                const evalRecord = roleProgress.find(p => p.title === lessonTitle);
                const hasStars = !!evalRecord;
                
                let iconClass = isLocked ? 'locked' : (hasStars ? 'completed' : '');
                let iconName = isLocked ? 'lock' : (hasStars ? 'check_circle' : level.icon);
                
                let lessonMeta = "Vídeo Aula";
                if (hasStars) {
                    const starsHTML = '<span style="color: #ffb400; font-size: 1rem;">' + '★'.repeat(evalRecord.stars) + '☆'.repeat(5 - evalRecord.stars) + '</span>';
                    lessonMeta = starsHTML;
                }
                
                lessonsHtml += `
                    <li class="lesson-item ${iconClass}" ${isLocked ? 'aria-disabled="true"' : `onclick="app.startLesson('${lessonTitle}', '${videoFile}', '${role.name}')" role="button" tabindex="0"`}>
                        <i  class="ti ti-${iconName}"></i>
                        <span class="title">${level.name}</span>
                        <span class="lesson-duration">${lessonMeta}</span>
                    </li>
                `;
            });

            html += `
                <div class="trilha-module ${borderClass}">
                    <div class="module-header">
                        <div class="module-title-group">
                            <span class="module-badge ${badgeClass}">
                                <i  class="ti ti-${badgeIcon}"></i>
                            </span>
                            <div>
                                <h3>Passo ${step.id}: ${step.title}</h3>
                                <p class="module-desc">${step.desc}</p>
                            </div>
                        </div>
                        <span class="progress-text">${pct}</span>
                    </div>
                    <div class="progress-bar" role="progressbar" aria-valuenow="${pctNum}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width: ${pct};"></div>
                    </div>
                    <ul class="lesson-list" role="list">
                        ${lessonsHtml}
                    </ul>
                    ${isActive ? `<button class="btn-primary module-cta" onclick="app.startLesson('${step.title} - ${this.curriculum.levels[0].name}', '${role.prefix}-${step.id}-${this.curriculum.levels[0].id}.mp4', '${role.name}')">
                        <i  class="ti ti-player-play-filled"></i>
                        Continuar Prática
                    </button>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        // Update Dino Bar
        const dinoFill = document.getElementById('dino-progress-fill');
        if (dinoFill) {
            const rProgress = this.state.user?.progress?.[role.name] || [];
            const evalCount = rProgress.length;
            const dinoPct = Math.min(100, Math.floor((evalCount / 18) * 100));
            dinoFill.style.width = dinoPct + '%';
        }
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
    /* setQuality — moved to video player as setVideoQuality() */

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

    /* ---- Theme Management ---- */
    setTheme(mode, btn) {
        // Update UI buttons
        document.querySelectorAll('.seg-control [id^="st-"]').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const root = document.documentElement;
        const labels = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };
        const lbl = document.getElementById('lbl-theme');
        if (lbl) lbl.innerText = labels[mode] || mode;

        // Remove manual overrides
        root.classList.remove('dark-theme', 'light-theme');

        if (mode === 'dark') {
            root.classList.add('dark-theme');
        } else if (mode === 'light') {
            root.classList.add('light-theme');
        }
        // 'system' → no class added, CSS media query handles it

        localStorage.setItem('sertao_theme', mode);
    },

    _initTheme() {
        const saved = localStorage.getItem('sertao_theme') || 'system';
        const btn = document.getElementById(`st-${saved}`);
        this.setTheme(saved, btn);
    },

    /* ======================================================
       VIDEO CONTROLS
       ====================================================== */
    toggleMirror() {
        const video = document.getElementById('lesson-video');
        const btn = document.getElementById('btn-mirror');
        if (!video || !btn) return;
        video.classList.toggle('mirrored');
        this.state.isMirrored = !this.state.isMirrored;
        btn.setAttribute('aria-pressed', this.state.isMirrored ? 'true' : 'false');
        if (this.state.isMirrored) {
            btn.classList.add('active');
            btn.querySelector('.material-symbols-rounded').style.color = 'var(--primary)';
        } else {
            btn.classList.remove('active');
            btn.querySelector('.material-symbols-rounded').style.color = '';
        }
        this._showControls();
    },

    toggleLoop() {
        const video = document.getElementById('main-video');
        const btn = document.getElementById('btn-loop');
        if (!video || !btn) return;
        video.loop = !video.loop;
        btn.setAttribute('aria-pressed', video.loop ? 'true' : 'false');
        if (video.loop) {
            btn.classList.add('active');
            btn.querySelector('.material-symbols-rounded').style.color = 'var(--primary)';
        } else {
            btn.classList.remove('active');
            btn.querySelector('.material-symbols-rounded').style.color = 'white';
        }
    },

    toggleTips() {
        // Close quality panel if open
        if (this.state.qualityPanelOpen) this.toggleQualityPanel();
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
                
                // Calc real progress for Student
                let totalLessonsEvaluated = 0;
                let totalStars = 0;
                if (this.state.user.progress) {
                    Object.keys(this.state.user.progress).forEach(danceKey => {
                        const lessons = this.state.user.progress[danceKey];
                        totalLessonsEvaluated += lessons.length;
                        lessons.forEach(l => {
                            totalStars += parseInt(l.stars || 0);
                        });
                    });
                }
                
                const calculatedLevel = Math.floor(totalLessonsEvaluated / 3) + 1;
                
                const lvlEl = document.getElementById('user-level');
                const lessonsEl = document.getElementById('stat-lessons');
                const starsEl = document.getElementById('stat-stars');
                
                if (lvlEl) lvlEl.innerText = 'Lvl ' + calculatedLevel;
                if (lessonsEl) lessonsEl.innerText = totalLessonsEvaluated;
                if (starsEl) starsEl.innerText = totalStars;
                
                const getTitleForLessons = (count) => {
                    if (count < 9) return 'Iniciante do Salão';
                    if (count < 18) return 'Pé de Valsa';
                    if (count < 36) return 'Dançarino(a) de Fogo';
                    if (count < 54) return 'Mestre(a) do Terreiro';
                    return 'Lenda do Sertão';
                };
                
                const titleBadgeEl = document.getElementById('user-title-badge');
                if (titleBadgeEl) titleBadgeEl.innerText = getTitleForLessons(totalLessonsEvaluated);
                
                // Render Titles Gallery
                const titlesContainer = document.getElementById('profile-titles');
                if (titlesContainer) {
                    const allTitles = [
                        { name: 'Iniciante do Salão', req: 0, icon: 'ti-music' },
                        { name: 'Pé de Valsa', req: 9, icon: 'ti-shoe' },
                        { name: 'Dançarino(a) de Fogo', req: 18, icon: 'ti-flame-filled' },
                        { name: 'Mestre(a) do Terreiro', req: 36, icon: 'ti-star-filled' },
                        { name: 'Lenda do Sertão', req: 54, icon: 'ti-crown' }
                    ];
                    let titlesHtml = '';
                    allTitles.forEach(t => {
                        const unlocked = totalLessonsEvaluated >= t.req;
                        const bg = unlocked ? 'var(--primary)' : 'rgba(0,0,0,0.05)';
                        const color = unlocked ? '#fff' : 'rgba(0,0,0,0.3)';
                        titlesHtml += `
                            <div style="background: ${bg}; color: ${color}; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                                <i class="ti ${t.icon}"></i> ${t.name}
                            </div>
                        `;
                    });
                    titlesContainer.innerHTML = titlesHtml;
                }

                this.updateHomeResumeCard();

                // Dynamic Progress Update & Trophies Gallery Unified
                const trophiesAll = document.getElementById('trophies-all');
                let trophiesHtml = '';

                // Build Social Trophy First
                const hasShared = this.state.user.achievements && this.state.user.achievements.sharedFirstTime;
                trophiesHtml += `
                    <div class="trophy-card" onclick="app.openTrophyInspection('influencer')">
                        <div class="trophy-card-viewer trophy-social" style="position: relative; opacity: ${hasShared ? '1' : '0.6'}; filter: ${hasShared ? 'none' : 'grayscale(100%)'};">
                            <i  class="ti ti-lock" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; color: rgba(255,255,255,0.8); z-index: 10; display: ${hasShared ? 'none' : 'block'};"></i>
                            <model-viewer src="image/Trofeu.glb" disable-zoom disable-pan environment-image="neutral" exposure="0.5"></model-viewer>
                        </div>
                        <h4>Influenciador</h4>
                        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px; overflow: hidden;">
                            <div class="trophy-progress-fill" style="width: ${hasShared ? '100' : '0'}%; height: 100%; background: var(--primary);"></div>
                        </div>
                    </div>
                `;

                const updateDanceProgress = (id) => {
                    // id in progress is Capitalized (Casal, Dama, Cavalheiro)
                    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
                    const danceId = capitalize(id);
                    
                    const lessons = this.state.user.progress && this.state.user.progress[danceId] ? this.state.user.progress[danceId] : [];
                    const doneCount = lessons.length;
                    
                    let starsCount = 0;
                    lessons.forEach(l => { starsCount += parseInt(l.stars || 0); });

                    const totalCount = 18; // Fixed max 18 per role
                    const pct = Math.round((doneCount / totalCount) * 100);

                    const pctEl = document.getElementById(`pct-${id}`);
                    const barEl = document.getElementById(`bar-${id}`);

                    if (pctEl) pctEl.innerText = `${pct}%`;
                    if (barEl) {
                        barEl.style.width = `${pct}%`;
                        barEl.parentElement.setAttribute('aria-valuenow', pct);
                    }

                    // Generate trophies HTML for this role
                    const hasBronze = doneCount >= 1;
                    const hasGold = starsCount >= 45;
                    const goldPct = Math.min((starsCount / 45) * 100, 100);
                    const hasPlat = starsCount >= 90;
                    const platPct = Math.min((starsCount / 90) * 100, 100);

                    trophiesHtml += `
                        <div class="trophy-card" onclick="app.openTrophyInspection('bronze')">
                            <div class="trophy-card-viewer" style="position: relative; opacity: ${hasBronze ? '1' : '0.6'}; filter: ${hasBronze ? 'none' : 'grayscale(100%)'};">
                                <i  class="ti ti-lock" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; color: rgba(255,255,255,0.8); z-index: 10; display: ${hasBronze ? 'none' : 'block'};"></i>
                                <model-viewer src="image/Trofeu.glb" disable-zoom disable-pan environment-image="neutral" exposure="0.5"></model-viewer>
                            </div>
                            <h4>Bronze <span style="font-size: 0.65rem; color: rgba(255,255,255,0.5); display:block;">(${danceId})</span></h4>
                            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px; overflow: hidden;">
                                <div style="width: ${hasBronze ? '100' : '0'}%; height: 100%; background: #cd7f32;"></div>
                            </div>
                        </div>
                        <div class="trophy-card" onclick="app.openTrophyInspection('gold')">
                            <div class="trophy-card-viewer" style="position: relative; opacity: ${hasGold ? '1' : '0.6'}; filter: ${hasGold ? 'none' : 'grayscale(100%)'};">
                                <i  class="ti ti-lock" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; color: rgba(255,255,255,0.8); z-index: 10; display: ${hasGold ? 'none' : 'block'};"></i>
                                <model-viewer src="image/Trofeu.glb" disable-zoom disable-pan environment-image="neutral" exposure="0.5"></model-viewer>
                            </div>
                            <h4>Ouro <span style="font-size: 0.65rem; color: rgba(255,255,255,0.5); display:block;">(${danceId})</span></h4>
                            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px; overflow: hidden;">
                                <div style="width: ${goldPct}%; height: 100%; background: #ffd700;"></div>
                            </div>
                            <small style="font-size: 0.65rem; color: rgba(255,255,255,0.5);">${Math.min(starsCount, 45)}/45 ★</small>
                        </div>
                        <div class="trophy-card" onclick="app.openTrophyInspection('platinum')">
                            <div class="trophy-card-viewer" style="position: relative; opacity: ${hasPlat ? '1' : '0.6'}; filter: ${hasPlat ? 'none' : 'grayscale(100%)'};">
                                <i  class="ti ti-lock" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; color: rgba(255,255,255,0.8); z-index: 10; display: ${hasPlat ? 'none' : 'block'};"></i>
                                <model-viewer src="image/Trofeu.glb" disable-zoom disable-pan environment-image="neutral" exposure="0.5"></model-viewer>
                            </div>
                            <h4>Platina <span style="font-size: 0.65rem; color: rgba(255,255,255,0.5); display:block;">(${danceId})</span></h4>
                            <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px; overflow: hidden;">
                                <div style="width: ${platPct}%; height: 100%; background: #e5e4e2;"></div>
                            </div>
                            <small style="font-size: 0.65rem; color: rgba(255,255,255,0.5);">${Math.min(starsCount, 90)}/90 ★</small>
                        </div>
                    `;
                };
                
                updateDanceProgress('casal');
                updateDanceProgress('dama');
                updateDanceProgress('cavalheiro');
                
                if (trophiesAll) trophiesAll.innerHTML = trophiesHtml;
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

    updateHomeResumeCard() {
        const card = document.getElementById('resume-card');
        const tagEl = document.getElementById('resume-tag');
        const titleEl = document.getElementById('resume-title');
        const pctEl = document.getElementById('resume-pct');
        const fillEl = document.getElementById('resume-progress-fill');
        const timeEl = document.getElementById('resume-time');
        
        if (!card || !titleEl) return;

        if (!this.state.isLoggedIn || !this.state.user || !this.state.user.progress) {
            // Default state — no progress
            if (tagEl) tagEl.innerText = 'QUADRILHA - CASAL';
            if (titleEl) titleEl.innerText = 'Marcação Básica';
            if (pctEl) pctEl.innerText = '0% concluído';
            if (fillEl) fillEl.style.width = '0%';
            if (timeEl) timeEl.innerText = 'Comece agora';
            card.onclick = () => {
                this.navigate('trilhas');
                this.switchTrilhaTab('casal');
            };
            return;
        }
        
        // Find the role with the most recent progress
        let lastDance = null;
        let lastLesson = null;
        let highestDate = 0;
        
        Object.keys(this.state.user.progress).forEach(danceKey => {
            this.state.user.progress[danceKey].forEach(lesson => {
                const d = new Date(lesson.date).getTime();
                if (d > highestDate) {
                    highestDate = d;
                    lastDance = danceKey;
                    lastLesson = lesson;
                }
            });
        });
        
        if (!lastDance) {
            // Has progress object but no entries
            if (tagEl) tagEl.innerText = 'QUADRILHA - CASAL';
            if (titleEl) titleEl.innerText = 'Marcação Básica';
            if (pctEl) pctEl.innerText = '0% concluído';
            if (fillEl) fillEl.style.width = '0%';
            if (timeEl) timeEl.innerText = 'Comece agora';
            return;
        }

        const tabName = lastDance.toLowerCase();
        const roleProgress = this.state.user.progress[lastDance] || [];
        const evaluatedCount = roleProgress.length;
        const totalLessons = 18; // 6 steps × 3 levels per role
        const pct = Math.min(100, Math.round((evaluatedCount / totalLessons) * 100));
        
        // Find next unevaluated lesson for this role
        let nextLessonTitle = lastLesson.title;
        const evaluatedTitles = roleProgress.map(p => p.title);
        
        for (const step of this.curriculum.steps) {
            for (const level of this.curriculum.levels) {
                const title = `${step.title} - ${level.name}`;
                if (!evaluatedTitles.includes(title)) {
                    nextLessonTitle = title;
                    break;
                }
            }
            if (nextLessonTitle !== lastLesson.title) break;
        }

        if (tagEl) tagEl.innerText = `QUADRILHA - ${lastDance.toUpperCase()}`;
        if (titleEl) titleEl.innerText = nextLessonTitle;
        if (pctEl) pctEl.innerText = `${pct}% concluído`;
        if (fillEl) fillEl.style.width = pct + '%';
        if (timeEl) timeEl.innerText = `${evaluatedCount} de ${totalLessons} aulas`;
        
        card.onclick = () => {
            this.navigate('trilhas');
            this.switchTrilhaTab(tabName);
        };
    }
};

/* ======================================================
   BOOTSTRAP
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => app.init());

