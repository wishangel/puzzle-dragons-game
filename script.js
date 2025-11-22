// パズル&ドラゴンズ風パズルゲーム - 拡張版

class PuzzleGame {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.particleContainer = document.getElementById('particle-container');

        // ゲーム設定
        this.cols = 6;
        this.rows = 5;
        this.orbSize = 0;
        this.padding = 10;

        // ドロップタイプの色定義
        this.orbColors = {
            fire: { gradient: ['#ff6b6b', '#ff4757'], glow: '#ff4757', img: 'img/fire.png', scale: 1.0 },
            water: { gradient: ['#4facfe', '#00f2fe'], glow: '#00f2fe', img: 'img/water.png', scale: 1.0 },
            wood: { gradient: ['#38ef7d', '#11998e'], glow: '#38ef7d', img: 'img/wood.png', scale: 1.0 },
            light: { gradient: ['#ffd89b', '#ffb347'], glow: '#ffd89b', img: 'img/light.png', scale: 1.0 },
            dark: { gradient: ['#667eea', '#764ba2'], glow: '#667eea', img: 'img/dark.png', scale: 0.85 },
            heal: { gradient: ['#fa709a', '#fee140'], glow: '#fa709a', img: 'img/heal.png', scale: 1.0 }
        };

        // 画像のプリロード
        this.orbImages = {};
        this.imagesLoaded = false;

        // ゲーム状態
        this.board = [];
        this.selectedOrb = null;
        this.isDragging = false;
        this.dragPath = [];
        this.score = 0;
        this.combo = 0;
        this.scoreSaved = false;
        this.moveStartTime = 0;
        this.maxMoveTime = 6000;

        // タイムアタックモード
        this.timeAttackMode = false;
        this.timeRemaining = 60;
        this.timerInterval = null;

        // ハイスコア
        this.highScore = this.loadHighScore('puzzleDragonsHighScore');
        this.timeAttackHighScore = this.loadHighScore('puzzleDragonsTimeAttackHighScore');

        // 編集モード
        this.isEditing = false;
        this.selectedEditOrb = 'fire';

        // スキル
        this.skillCooldown = 0;
        this.maxSkillCooldown = 5;

        // サウンド
        this.audioContext = null;
        this.soundEnabled = false; // デフォルトはオフ

        // BGM
        this.bgm = null;
        this.bgmEnabled = false; // デフォルトはオフ
        this.bgmPath = 'music/bgm_instrumental.mp4';

        // 利用可能なドロップタイプ
        this.availableOrbTypes = ['fire', 'water', 'wood', 'light', 'dark'];

        this.init();
    }

    init() {
        this.loadImages();
        this.initBGM();
        this.setupCanvas();
        this.setupEventListeners();
        this.initBoard();
        this.updateHighScoreDisplay();
        this.draw();
    }

    loadImages() {
        const imagesToLoad = Object.keys(this.orbColors).length;
        let loadedCount = 0;

        Object.keys(this.orbColors).forEach(type => {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === imagesToLoad) {
                    this.imagesLoaded = true;
                    this.draw();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image for ${type}, using gradient fallback`);
                loadedCount++;
                if (loadedCount === imagesToLoad) {
                    this.imagesLoaded = true;
                    this.draw();
                }
            };
            img.src = this.orbColors[type].img;
            this.orbImages[type] = img;
        });
    }

    initBGM() {
        this.bgm = new Audio(this.bgmPath);
        this.bgm.loop = true;
        this.bgm.volume = 0.3;
    }

    playBGM() {
        if (this.bgm && this.bgmEnabled) {
            this.bgm.play().catch(err => {
                console.warn('BGM再生エラー:', err);
            });
        }
    }

    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        if (this.bgmEnabled) {
            this.playBGM();
        } else {
            this.stopBGM();
        }
    }

    loadHighScore(key) {
        const saved = localStorage.getItem(key);
        return saved ? parseInt(saved) : 0;
    }

    saveHighScore() {
        if (this.timeAttackMode) {
            if (this.score > this.timeAttackHighScore) {
                this.timeAttackHighScore = this.score;
                localStorage.setItem('puzzleDragonsTimeAttackHighScore', this.timeAttackHighScore);
                this.updateHighScoreDisplay();
            }
        } else {
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('puzzleDragonsHighScore', this.highScore);
                this.updateHighScoreDisplay();
            }
        }
    }

    updateHighScoreDisplay() {
        const normalHighScoreElement = document.getElementById('high-score-normal');
        const timeAttackHighScoreElement = document.getElementById('high-score-timeattack');

        if (normalHighScoreElement) {
            normalHighScoreElement.textContent = this.highScore;
        }
        if (timeAttackHighScoreElement) {
            timeAttackHighScoreElement.textContent = this.timeAttackHighScore;
        }
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = Math.min(container.clientWidth, 600);

        // ドロップのサイズを計算（幅基準）
        this.orbSize = (containerWidth - this.padding * 2) / this.cols;

        // 高さは行数に基づいて計算
        const containerHeight = this.orbSize * this.rows + this.padding * 2;

        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;

        // スタイルも合わせる
        this.canvas.style.width = `${containerWidth}px`;
        this.canvas.style.height = `${containerHeight}px`;
        document.querySelectorAll('.orb-option input').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateAvailableOrbs());
        });

        // ボードサイズ変更
        document.getElementById('board-size').addEventListener('change', (e) => {
            const size = parseInt(e.target.value);
            this.cols = size;
            this.rows = size - 1;
            this.setupCanvas();
            this.initBoard();
            this.draw();
        });

        // リセットボタン
        document.getElementById('reset-board').addEventListener('click', () => {
            this.initBoard();
            this.draw();
        });

        // タイムアタックモードボタン
        const timeAttackBtn = document.getElementById('time-attack-btn');
        if (timeAttackBtn) {
            timeAttackBtn.addEventListener('click', () => {
                if (this.timeAttackMode) {
                    this.stopTimeAttack();
                } else {
                    this.startTimeAttack();
                }
            });
        }

        // スキルボタン
        const skill1Btn = document.getElementById('skill-1');
        const skill2Btn = document.getElementById('skill-2');
        if (skill1Btn) {
            skill1Btn.addEventListener('click', () => this.useSkill1());
        }
        if (skill2Btn) {
            skill2Btn.addEventListener('click', () => this.useSkill2());
        }

        // アシストルートボタン
        const assistRouteBtn = document.getElementById('assist-route-btn');
        if (assistRouteBtn) {
            assistRouteBtn.addEventListener('click', () => this.showAssistRoute());
        }

        // 画像読み込みボタン
        const loadImageBtn = document.getElementById('load-image-btn');
        const boardImageInput = document.getElementById('board-image-input');
        if (loadImageBtn && boardImageInput) {
            loadImageBtn.addEventListener('click', () => boardImageInput.click());
            boardImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // 盤面編集モードボタン
        const editBoardBtn = document.getElementById('edit-board-btn');
        console.log('[DEBUG] Edit button found:', !!editBoardBtn);
        if (editBoardBtn) {
            const handleToggle = (e) => {
                console.log('[DEBUG] Edit button triggered, event:', e.type);
                e.preventDefault();
                e.stopPropagation();
                this.toggleEditMode();
            };
            editBoardBtn.addEventListener('click', handleToggle);
            editBoardBtn.addEventListener('touchend', handleToggle, { passive: false });
            console.log('[DEBUG] Edit button listeners registered');
        }

        // 編集パレットの選択
        const paletteOrbs = document.querySelectorAll('.palette-orb');
        console.log('[DEBUG] Palette orbs found:', paletteOrbs.length);
        paletteOrbs.forEach(orb => {
            const handleOrbSelect = (e) => {
                console.log('[DEBUG] Palette orb selected:', e.currentTarget.dataset.type);
                e.preventDefault();
                e.stopPropagation();

                // アクティブ状態の切り替え
                paletteOrbs.forEach(o => {
                    o.classList.remove('active');
                    o.style.border = 'none';
                });
                const target = e.currentTarget;
                target.classList.add('active');
                target.style.border = '2px solid yellow';

                this.selectedEditOrb = target.dataset.type;
            };
            orb.addEventListener('click', handleOrbSelect);
            orb.addEventListener('touchend', handleOrbSelect, { passive: false });
        });

        // サウンドトグル
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
            });
        }

        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.draw();
        });
    }

    setupEventListeners() {
        // マウス操作
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        window.addEventListener('mousemove', (e) => this.handleInputMove(e));
        window.addEventListener('mouseup', () => this.handleInputEnd());

        // タッチ操作
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleInputMove(e), { passive: false });
        window.addEventListener('touchend', () => this.handleInputEnd());
    }

    toggleEditMode() {
        console.log('[DEBUG] toggleEditMode called, current:', this.isEditing);
        this.isEditing = !this.isEditing;
        const palette = document.getElementById('edit-palette');
        const btn = document.getElementById('edit-board-btn');
        console.log('[DEBUG] New mode:', this.isEditing ? 'EDIT' : 'NORMAL');

        if (this.isEditing) {
            if (palette) {
                palette.style.display = 'flex';
                console.log('[DEBUG] Palette shown');
            } else {
                console.error('[DEBUG] Palette element not found!');
            }
            if (btn) {
                btn.textContent = '編集終了';
                btn.classList.add('active');
                console.log('[DEBUG] Button text changed to 編集終了');
            }
            this.canvas.style.cursor = 'crosshair';
        } else {
            if (palette) {
                palette.style.display = 'none';
                console.log('[DEBUG] Palette hidden');
            }
            if (btn) {
                btn.textContent = '盤面編集モード';
                btn.classList.remove('active');
                console.log('[DEBUG] Button text changed to 盤面編集モード');
            }
            this.canvas.style.cursor = 'default';
        }
    }

    handleInputStart(e) {
        e.preventDefault();
        const pos = this.getPointerPos(e);
        const col = Math.floor((pos.x - this.padding) / this.orbSize);
        const row = Math.floor((pos.y - this.padding) / this.orbSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            // 編集モードの場合
            if (this.isEditing) {
                this.board[row][col] = this.selectedEditOrb;
                this.draw();
                this.isDragging = true; // なぞり書き用にフラグを立てる
                return;
            }

            // 通常モード
            if (!this.timeAttackMode) {
                this.score = 0;
                this.combo = 0;
                this.scoreSaved = false;
                this.updateScore();
            }

            this.isDragging = true;
            this.selectedOrb = { row, col };
            this.dragPath = [{ row, col }];
            this.moveStartTime = Date.now();

            if (this.bgmEnabled && this.bgm && this.bgm.paused) {
                this.playBGM();
            }

            this.canvas.style.cursor = 'grabbing';
            this.playSound('move');
            this.draw();
        }
    }

    handleInputMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();

        const pos = this.getPointerPos(e);
        const col = Math.floor((pos.x - this.padding) / this.orbSize);
        const row = Math.floor((pos.y - this.padding) / this.orbSize);

        // 編集モードの場合（なぞり書き）
        if (this.isEditing) {
            if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                if (this.board[row][col] !== this.selectedEditOrb) {
                    this.board[row][col] = this.selectedEditOrb;
                    this.draw();
                }
            }
            return;
        }

        // 通常モード
        if (!this.selectedOrb) return;

        if (Date.now() - this.moveStartTime > this.maxMoveTime) {
            this.handleInputEnd();
            return;
        }

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const lastPos = this.dragPath[this.dragPath.length - 1];
            if (lastPos.row !== row || lastPos.col !== col) {
                if (Math.abs(lastPos.row - row) <= 1 && Math.abs(lastPos.col - col) <= 1) {
                    const temp = this.board[row][col];
                    this.board[row][col] = this.board[lastPos.row][lastPos.col];
                    this.board[lastPos.row][lastPos.col] = temp;

                    this.dragPath.push({ row, col });
                    this.selectedOrb = { row, col };
                    this.playSound('move');
                    this.draw();
                }
            }
        }
    }

    updateAvailableOrbs() {
        this.availableOrbTypes = Array.from(document.querySelectorAll('.orb-option input:checked'))
            .map(checkbox => checkbox.value);

        if (this.availableOrbTypes.length === 0) {
            document.querySelector('.orb-option input').checked = true;
            this.availableOrbTypes = [document.querySelector('.orb-option input').value];
        }

        this.initBoard();
        this.draw();
    }

    initBoard() {
        // ボードリセット時にスコアもリセット
        this.score = 0;
        this.combo = 0;
        this.scoreSaved = false;
        this.updateScore();

        this.board = [];
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = this.getRandomOrbType();
            }
        }

        // 初期配置でマッチしているものがあれば消す
        let matches = this.findMatches();
        while (matches.length > 0) {
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    this.board[row][col] = this.getRandomOrbType();
                }
            }
            matches = this.findMatches();
        }
    }

    getRandomOrbType() {
        const randomIndex = Math.floor(Math.random() * this.availableOrbTypes.length);
        return this.availableOrbTypes[randomIndex];
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // キャンバスの表示サイズと内部解像度の比率を考慮
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    async handleInputEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.selectedOrb = null;
        this.dragPath = [];
        this.canvas.style.cursor = this.isEditing ? 'crosshair' : 'default';

        if (this.isEditing) {
            return;
        }

        this.processMatches();
    }

    async processMatches() {
        let totalCombo = 0;
        let hasMatches = true;

        while (hasMatches) {
            const matches = this.findMatches();

            if (matches.length === 0) {
                hasMatches = false;
                break;
            }

            totalCombo += matches.length;

            await this.clearMatches(matches);
            await this.dropOrbs();
            this.fillBoard();

            this.draw();
            await this.sleep(300);
        }

        if (totalCombo > 0) {
            this.combo = totalCombo;
            this.score += totalCombo * 100;

            if (this.skillCooldown > 0) {
                this.skillCooldown--;
                this.updateSkillCooldown();
            }

            this.updateScore();
            this.animateCombo();
            this.playSound('combo');
            this.saveHighScore();

            // 通常プレイで1000点超えたら保存
            if (!this.timeAttackMode && this.score >= 1000 && !this.scoreSaved) {
                this.scoreSaved = true;
                setTimeout(() => {
                    if (window.firebaseManager) {
                        const name = prompt("スコアが1000点を超えました！ランキングに登録する名前を入力してください:", "名無し");
                        if (name) {
                            window.firebaseManager.saveScore(name, this.score, 'normal');
                        }
                    }
                }, 500);
            }
        }

    }

    findMatches() {
        const matches = [];

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols - 2; col++) {
                const type = this.board[row][col];
                if (!type) continue;

                let matchLength = 1;
                for (let c = col + 1; c < this.cols && this.board[row][c] === type; c++) {
                    matchLength++;
                }

                if (matchLength >= 3) {
                    const match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push({ row, col: col + i, type });
                    }
                    matches.push(match);
                    col += matchLength - 1;
                }
            }
        }

        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows - 2; row++) {
                const type = this.board[row][col];
                if (!type) continue;

                let matchLength = 1;
                for (let r = row + 1; r < this.rows && this.board[r][col] === type; r++) {
                    matchLength++;
                }

                if (matchLength >= 3) {
                    const match = [];
                    for (let i = 0; i < matchLength; i++) {
                        match.push({ row: row + i, col, type });
                    }
                    matches.push(match);
                    row += matchLength - 1;
                }
            }
        }

        return matches;
    }

    async clearMatches(matches) {
        // マッチしたドロップをソート（下から上、左から右の順）
        matches.sort((a, b) => {
            const getAnchor = (match) => {
                let maxRow = -1;
                match.forEach(orb => {
                    if (orb.row > maxRow) maxRow = orb.row;
                });
                let minCol = 1000;
                match.forEach(orb => {
                    if (orb.row === maxRow && orb.col < minCol) minCol = orb.col;
                });
                return { row: maxRow, col: minCol };
            };

            const anchorA = getAnchor(a);
            const anchorB = getAnchor(b);

            if (anchorA.row !== anchorB.row) {
                return anchorB.row - anchorA.row; // Row Descending (Bottom first)
            }
            return anchorA.col - anchorB.col; // Col Ascending (Left first)
        });

        for (const match of matches) {
            for (const orb of match) {
                this.createParticles(orb.row, orb.col, orb.type);
                this.board[orb.row][orb.col] = null;
            }
            this.playSound('clear');
            this.draw();
            await this.sleep(300);
        }
    }

    createParticles(row, col, type) {
        const x = this.padding + col * this.orbSize + this.orbSize / 2;
        const y = this.padding + row * this.orbSize + this.orbSize / 2;

        const rect = this.canvas.getBoundingClientRect();
        const absoluteX = rect.left + x;
        const absoluteY = rect.top + y;

        const color = this.orbColors[type].glow;

        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${absoluteX - rect.left}px`;
            particle.style.top = `${absoluteY - rect.top}px`;
            particle.style.background = color;

            const angle = (Math.PI * 2 * i) / 8;
            const distance = 50 + Math.random() * 30;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            this.particleContainer.appendChild(particle);

            setTimeout(() => particle.remove(), 1000);
        }
    }

    async dropOrbs() {
        let dropped = false;

        do {
            dropped = false;

            for (let row = this.rows - 2; row >= 0; row--) {
                for (let col = 0; col < this.cols; col++) {
                    if (this.board[row][col] && !this.board[row + 1][col]) {
                        this.board[row + 1][col] = this.board[row][col];
                        this.board[row][col] = null;
                        dropped = true;
                    }
                }
            }

            if (dropped) {
                this.draw();
                await this.sleep(100);
            }
        } while (dropped);
    }

    fillBoard() {
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                if (!this.board[row][col]) {
                    this.board[row][col] = this.getRandomOrbType();
                }
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.board || this.board.length !== this.rows) return;

        for (let row = 0; row < this.rows; row++) {
            if (!this.board[row]) continue;
            for (let col = 0; col < this.cols; col++) {
                const type = this.board[row][col];
                if (!type) continue;

                const x = this.padding + col * this.orbSize;
                const y = this.padding + row * this.orbSize;

                this.drawOrb(x, y, type, this.orbSize);
            }
        }

        if (this.selectedOrb) {
            const x = this.padding + this.selectedOrb.col * this.orbSize;
            const y = this.padding + this.selectedOrb.row * this.orbSize;

            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(
                x + this.orbSize / 2,
                y + this.orbSize / 2,
                this.orbSize / 2 - 5,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
        }

        this.drawDragPath();
        this.drawAssistRoute();
    }

    drawOrb(x, y, type, size) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 2 - 3; // パディングを考慮して少し小さく
        const isHeal = type === 'heal';

        if (this.imagesLoaded && this.orbImages[type] && this.orbImages[type].complete) {
            this.ctx.save();

            // 影
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 4;

            // クリッピングパスを作成
            this.ctx.beginPath();
            if (isHeal) {
                const rectSize = radius * 1.8;
                const cornerRadius = 8;
                this.ctx.roundRect(
                    centerX - rectSize / 2,
                    centerY - rectSize / 2,
                    rectSize,
                    rectSize,
                    cornerRadius
                );
            } else {
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            }
            this.ctx.clip();

            // 画像を描画 (引き伸ばして表示)
            const img = this.orbImages[type];
            const imgRatio = img.width / img.height;

            // アスペクト比を維持して描画（Cover）
            let drawWidth, drawHeight;
            let drawX, drawY;

            if (imgRatio > 1) {
                // 画像が横長の場合
                drawHeight = size;
                drawWidth = size * imgRatio;
                drawX = x + (size - drawWidth) / 2;
                drawY = y;
            } else {
                // 画像が縦長の場合
                drawWidth = size;
                drawHeight = size / imgRatio;
                drawX = x;
                drawY = y + (size - drawHeight) / 2;
            }

            // スケール適用
            const scale = this.orbColors[type].scale || 1.0;
            const originalWidth = drawWidth;
            const originalHeight = drawHeight;

            drawWidth *= scale;
            drawHeight *= scale;

            // 中心を維持してリサイズ
            drawX += (originalWidth - drawWidth) / 2;
            drawY += (originalHeight - drawHeight) / 2;

            this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

            this.ctx.restore();

            // 枠線
            this.ctx.save();
            this.ctx.shadowColor = 'transparent';
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            if (isHeal) {
                const rectSize = radius * 1.8;
                const cornerRadius = 8;
                this.ctx.roundRect(
                    centerX - rectSize / 2,
                    centerY - rectSize / 2,
                    rectSize,
                    rectSize,
                    cornerRadius
                );
            } else {
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            }
            this.ctx.stroke();
            this.ctx.restore();

        } else {
            // フォールバック: グラデーション
            const gradient = this.ctx.createRadialGradient(
                centerX - radius / 3,
                centerY - radius / 3,
                0,
                centerX,
                centerY,
                radius
            );

            const colors = this.orbColors[type].gradient;
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            if (isHeal) {
                const rectSize = radius * 1.8;
                const cornerRadius = 8;
                this.ctx.roundRect(
                    centerX - rectSize / 2,
                    centerY - rectSize / 2,
                    rectSize,
                    rectSize,
                    cornerRadius
                );
            } else {
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            }
            this.ctx.fill();
        }
    }

    drawDragPath() {
        if (this.dragPath.length < 2) return;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        for (let i = 0; i < this.dragPath.length; i++) {
            const orb = this.dragPath[i];
            const x = this.padding + orb.col * this.orbSize + this.orbSize / 2;
            const y = this.padding + orb.row * this.orbSize + this.orbSize / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('combo-count').textContent = this.combo;
    }

    animateCombo() {
        const comboElement = document.getElementById('combo-count');
        comboElement.parentElement.classList.add('combo-popup');
        setTimeout(() => {
            comboElement.parentElement.classList.remove('combo-popup');
        }, 300);
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        switch (type) {
            case 'move':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.05);
                break;
            case 'clear':
                oscillator.frequency.value = 400;
                gainNode.gain.value = 0.15;
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                break;
            case 'combo':
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.15);
                break;
            case 'skill':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.25;
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
                break;
        }
    }

    startTimeAttack() {
        if (this.timeAttackMode) return;
        this.timeAttackMode = true;

        this.score = 0;
        this.combo = 0;
        this.updateScore();
        this.updateHighScoreDisplay();

        this.timeRemaining = 60;

        const btn = document.getElementById('time-attack-btn');
        btn.textContent = 'タイムアタック停止';
        btn.classList.add('active');

        document.getElementById('timer-display').style.display = 'block';
        document.getElementById('timer').textContent = this.timeRemaining;

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            document.getElementById('timer').textContent = this.timeRemaining;

            if (this.timeRemaining <= 0) {
                this.endTimeAttack();
            }
        }, 1000);
    }

    stopTimeAttack() {
        if (!this.timeAttackMode) return;
        clearInterval(this.timerInterval);
        this.timeAttackMode = false;

        const btn = document.getElementById('time-attack-btn');
        btn.textContent = 'タイムアタック開始';
        btn.classList.remove('active');

        document.getElementById('timer-display').style.display = 'none';
        this.updateHighScoreDisplay();
    }

    endTimeAttack() {
        this.stopTimeAttack();
        alert(`タイムアップ！ スコア: ${this.score}`);
        this.saveHighScore();

        if (window.firebaseManager && this.score >= 3000) {
            const name = prompt("スコアが3000点を超えました！ランキングに登録する名前を入力してください:", "名無し");
            if (name) {
                window.firebaseManager.saveScore(name, this.score, 'time_attack');
            }
        }
    }

    useSkill1() {
        if (this.skillCooldown > 0) {
            alert('スキルはクールダウン中です！');
            return;
        }
        this.playSound('skill');
        this.board = this.board.map(row => row.map(() => null));
        this.fillBoard();
        this.draw();
        this.skillCooldown = this.maxSkillCooldown;
        this.updateSkillCooldown();
    }

    useSkill2() {
        if (this.skillCooldown > 0) {
            alert('スキルはクールダウン中です！');
            return;
        }
        this.playSound('skill');
        const targetType = this.getRandomOrbType();
        const convertType = this.getRandomOrbType();
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] === targetType) {
                    this.board[row][col] = convertType;
                }
            }
        }
        this.draw();
        this.skillCooldown = this.maxSkillCooldown;
        this.updateSkillCooldown();
    }

    updateSkillCooldown() {
        const skill1Btn = document.getElementById('skill-1');
        const skill2Btn = document.getElementById('skill-2');
        if (skill1Btn) {
            skill1Btn.disabled = this.skillCooldown > 0;
            skill1Btn.textContent = this.skillCooldown > 0 ? `全消し (${this.skillCooldown})` : '全消し';
        }
        if (skill2Btn) {
            skill2Btn.disabled = this.skillCooldown > 0;
            skill2Btn.textContent = this.skillCooldown > 0 ? `変換 (${this.skillCooldown})` : '変換';
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // アシストルートメソッド群
    showAssistRoute() {
        const btn = document.getElementById('assist-route-btn');
        btn.textContent = '計算中...';
        btn.disabled = true;

        setTimeout(() => {
            const bestRoute = this.findBestRoute();
            if (bestRoute && bestRoute.combos >= 1) {
                this.displayRoute(bestRoute);
                btn.textContent = `ルート表示中 (${bestRoute.combos}コンボ)`;
                btn.classList.add('active');
                setTimeout(() => {
                    this.clearRoute();
                    btn.textContent = 'アシストルート';
                    btn.classList.remove('active');
                    btn.disabled = false;
                }, 10000);
            } else {
                btn.textContent = 'アシストルート';
                btn.disabled = false;
                alert('有効なルートが見つかりませんでした');
            }
        }, 100);
    }

    findBestRoute() {
        const beamWidth = 100; // ビーム幅（各ステップで残す候補数）
        const maxMoves = 35;   // 最大手数

        let bestRoute = null;
        let bestScore = -1;

        // 初期状態の生成（全マスを開始点とする）
        let currentStates = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                currentStates.push({
                    board: this.board.map(row => [...row]),
                    cursor: { row: r, col: c },
                    path: [{ row: r, col: c }],
                    score: 0,
                    combos: 0
                });
            }
        }

        // ビームサーチ実行
        for (let move = 0; move < maxMoves; move++) {
            let nextStates = [];
            // 現在の候補数が多すぎる場合は、スコア順に絞り込む（ビーム幅制限）
            if (currentStates.length > beamWidth) {
                currentStates.sort((a, b) => b.score - a.score);
                currentStates = currentStates.slice(0, beamWidth);
            }

            for (const state of currentStates) {
                // 上下左右への移動を試行
                const directions = [
                    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
                ];

                for (const dir of directions) {
                    const newRow = state.cursor.row + dir.dr;
                    const newCol = state.cursor.col + dir.dc;

                    // 盤面外チェック
                    if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
                        continue;
                    }

                    // 直前の位置に戻る移動は除外（無駄な往復を防ぐ）
                    if (state.path.length > 1) {
                        const prev = state.path[state.path.length - 2];
                        if (prev.row === newRow && prev.col === newCol) {
                            continue;
                        }
                    }

                    // 新しい盤面状態を作成
                    const newBoard = state.board.map(row => [...row]);
                    // ドロップ交換
                    const temp = newBoard[newRow][newCol];
                    newBoard[newRow][newCol] = newBoard[state.cursor.row][state.cursor.col];
                    newBoard[state.cursor.row][state.cursor.col] = temp;

                    // 評価値の計算
                    const combos = this.countCombos(newBoard);
                    const potential = this.calculatePotential(newBoard);

                    // スコア = コンボ数重視 + 潜在的な繋がり
                    // コンボ数は大きく評価し、同コンボ数なら繋がりが多い方を優先
                    const score = combos * 1000 + potential;

                    const newState = {
                        board: newBoard,
                        cursor: { row: newRow, col: newCol },
                        path: [...state.path, { row: newRow, col: newCol }],
                        score: score,
                        combos: combos
                    };

                    nextStates.push(newState);

                    // ベストスコアの更新
                    // コンボ数が増えた、または同じコンボ数でスコアが高い（形が良い）場合に更新
                    if (combos > bestScore || (combos === bestScore && score > (bestRoute ? bestRoute.score : -1))) {
                        bestScore = combos;
                        bestRoute = newState;
                    }
                }
            }

            currentStates = nextStates;

            // 探索候補がなくなったら終了
            if (currentStates.length === 0) break;
        }

        return bestRoute ? { path: bestRoute.path, combos: bestRoute.combos, score: bestRoute.score } : null;
    }

    // 潜在的なコンボの可能性（隣接ボーナス）を計算
    calculatePotential(board) {
        let potential = 0;
        // 横方向の連結チェック
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 1; c++) {
                if (board[r][c] === board[r][c + 1]) potential++;
            }
        }
        // 縦方向の連結チェック
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 1; r++) {
                if (board[r][c] === board[r + 1][c]) potential++;
            }
        }
        return potential;
    }

    countCombos(board) {
        let comboCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols - 2; col++) {
                const type = board[row][col];
                if (!type) continue;
                let matchLength = 1;
                for (let c = col + 1; c < this.cols && board[row][c] === type; c++) matchLength++;
                if (matchLength >= 3) { comboCount++; col += matchLength - 1; }
            }
        }
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows - 2; row++) {
                const type = board[row][col];
                if (!type) continue;
                let matchLength = 1;
                for (let r = row + 1; r < this.rows && board[r][col] === type; r++) matchLength++;
                if (matchLength >= 3) { comboCount++; row += matchLength - 1; }
            }
        }
        return comboCount;
    }

    drawAssistRoute() {
        if (!this.assistRoute || this.assistRoute.length < 2) return;

        // 1. ルート全体を薄く描画
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        for (let i = 0; i < this.assistRoute.length; i++) {
            const orb = this.assistRoute[i];
            const x = this.padding + orb.col * this.orbSize + this.orbSize / 2;
            const y = this.padding + orb.row * this.orbSize + this.orbSize / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
                // 開始点を強調
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.orbSize / 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // 2. アニメーション：現在の進行状況に合わせて濃い線を描画
        if (this.assistRouteProgress > 0) {
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 1.0)';
            this.ctx.lineWidth = 6;
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = 15;

            this.ctx.beginPath();
            const startOrb = this.assistRoute[0];
            let startX = this.padding + startOrb.col * this.orbSize + this.orbSize / 2;
            let startY = this.padding + startOrb.row * this.orbSize + this.orbSize / 2;
            this.ctx.moveTo(startX, startY);

            // 進行状況（インデックス）までのパスを描画
            const currentIndex = Math.floor(this.assistRouteProgress);
            const progressFraction = this.assistRouteProgress - currentIndex;

            for (let i = 1; i <= currentIndex && i < this.assistRoute.length; i++) {
                const orb = this.assistRoute[i];
                const x = this.padding + orb.col * this.orbSize + this.orbSize / 2;
                const y = this.padding + orb.row * this.orbSize + this.orbSize / 2;
                this.ctx.lineTo(x, y);
            }

            // 現在移動中の線分を描画
            if (currentIndex < this.assistRoute.length - 1) {
                const currentOrb = this.assistRoute[currentIndex];
                const nextOrb = this.assistRoute[currentIndex + 1];

                const curX = this.padding + currentOrb.col * this.orbSize + this.orbSize / 2;
                const curY = this.padding + currentOrb.row * this.orbSize + this.orbSize / 2;

                const nextX = this.padding + nextOrb.col * this.orbSize + this.orbSize / 2;
                const nextY = this.padding + nextOrb.row * this.orbSize + this.orbSize / 2;

                const interpX = curX + (nextX - curX) * progressFraction;
                const interpY = curY + (nextY - curY) * progressFraction;

                this.ctx.lineTo(interpX, interpY);

                // 先端に光る点を描画
                this.ctx.stroke(); // ここまでの線を一旦描画

                this.ctx.fillStyle = '#ffffff';
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(interpX, interpY, 6, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.stroke();
            }

            // 影をリセット
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.analyzeBoardImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    analyzeBoardImage(img) {
        // 画像解析用のCanvasを作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 盤面領域の推定（簡易的に画像の下半分の中央を使用）
        // 実際のスマホスクショでは盤面は下部にあることが多い
        // アスペクト比などから調整が必要かもしれないが、まずは中央下部を狙う

        // 盤面の幅と高さを推定（横幅の100%、アスペクト比6:5）
        // 一般的なスマホ画面では横幅いっぱいに盤面が表示されることが多い
        const boardWidth = img.width * 1.0;
        const boardHeight = boardWidth * (5 / 6);

        // 盤面の開始位置（下揃え）
        // 画面下端から少し（高さの2%程度）浮いた位置に盤面があると仮定
        // これにより、縦長画面でも盤面位置をより正確に捉えられる
        const bottomMargin = img.height * 0.02;
        const startX = (img.width - boardWidth) / 2;
        const startY = img.height - boardHeight - bottomMargin;

        // グリッドサイズ
        const cellWidth = boardWidth / this.cols;
        const cellHeight = boardHeight / this.rows;

        const newBoard = [];

        for (let row = 0; row < this.rows; row++) {
            const newRow = [];
            for (let col = 0; col < this.cols; col++) {
                // 各セルの中心付近の色を取得
                const centerX = startX + col * cellWidth + cellWidth / 2;
                const centerY = startY + row * cellHeight + cellHeight / 2;

                // 中心周辺の平均色を取得（10x10ピクセル）
                const pixelData = ctx.getImageData(centerX - 5, centerY - 5, 10, 10).data;
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < pixelData.length; i += 4) {
                    r += pixelData[i];
                    g += pixelData[i + 1];
                    b += pixelData[i + 2];
                }
                const count = pixelData.length / 4;
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                const type = this.detectOrbType(r, g, b);
                newRow.push(type);
            }
            newBoard.push(newRow);
        }

        // 盤面を更新
        this.board = newBoard;
        this.draw();
        alert('画像を読み込みました。盤面が正しくない場合は手動で調整してください（未実装）。');

        // 入力をリセットして同じファイルを再度読み込めるようにする
        document.getElementById('board-image-input').value = '';
    }

    detectOrbType(r, g, b) {
        const [h, s, v] = this.rgbToHsv(r, g, b);

        // HSV & RGB ハイブリッド判定

        // 1. 闇 (Dark)
        // 特徴: 暗い、または紫 (RとBが高く、Gが低い)
        // 明度が極端に低い場合は無条件で闇
        if (v < 35) return 'dark';

        // 紫色判定: 色相が青紫〜赤紫、かつG成分がR, Bより低い
        // 明るすぎる紫(ピンク寄り)は回復に回すため、明度上限を設けるか、Gとの差を見る
        if ((h >= 230 && h <= 320) && r > g + 10 && b > g + 10) {
            // 彩度が低すぎるとグレー(お邪魔?)や回復の可能性。闇は彩度がそこそこある
            if (s > 20 && v < 85) return 'dark';
        }

        // 2. 回復 (Heal)
        // 特徴: ピンク (R > B > G)、白っぽい (高明度・低彩度)
        // 火との決定的な違いは「B成分の高さ」と「彩度の低さ」

        // 白っぽさ判定: 明度が非常に高く、彩度が低い
        if (v > 85 && s < 40) return 'heal';

        // ピンク色判定: 色相が赤〜マゼンタ、かつB成分がしっかりある
        // 火はB成分が非常に少ない
        if ((h >= 290 || h <= 20) && b > 100 && b > g) {
            return 'heal';
        }

        // 3. 火 (Fire)
        // 特徴: 鮮やかな赤 (R >> G, B)
        // 色相が赤付近で、彩度が高い
        if ((h >= 330 || h <= 30) && s >= 45) {
            // 念のためB成分が低めであることを確認 (回復との誤認防止)
            if (b < r * 0.8) return 'fire';
        }

        // 4. その他の色 (光、木、水)

        // 光 (黄): 色相が黄色
        if (h >= 35 && h <= 85) return 'light';

        // 木 (緑): 色相が緑
        if (h >= 90 && h <= 160) return 'wood';

        // 水 (青): 色相が青
        if (h >= 170 && h <= 260) return 'water';

        // フォールバック (判定漏れの場合の最終手段)
        // RGBの最大値を持つ成分で判定
        if (r > g && r > b) {
            // 赤系: 火か回復か闇
            if (b > g && b > r * 0.6) return 'heal'; // Bが多ければ回復
            return 'fire';
        }
        if (b > r && b > g) {
            // 青系: 水か闇
            if (r > g && r > b * 0.6) return 'dark'; // Rも多ければ闇
            return 'water';
        }
        if (g > r && g > b) return 'wood';

        // それでも決まらない場合 (黄色系など)
        if (r > 150 && g > 150) return 'light';

        return 'heal'; // デフォルト
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, v * 100];
    }

    displayRoute(route) {
        this.assistRoute = route.path;
        this.assistRouteProgress = 0;

        // アニメーションループを開始
        if (this.assistAnimationId) {
            cancelAnimationFrame(this.assistAnimationId);
        }

        const animate = () => {
            if (!this.assistRoute) return;

            // 進行状況を進める (速度調整: 0.1 = 1フレームあたり0.1ステップ進む)
            this.assistRouteProgress += 0.15;

            // 最後まで到達したら最初に戻る（少し待機してから）
            this.ctx.shadowBlur = 0;
        }
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.analyzeBoardImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    analyzeBoardImage(img) {
        // 画像解析用のCanvasを作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 盤面領域の推定（簡易的に画像の下半分の中央を使用）
        // 実際のスマホスクショでは盤面は下部にあることが多い
        // アスペクト比などから調整が必要かもしれないが、まずは中央下部を狙う

        // 盤面の幅と高さを推定（横幅の100%、アスペクト比6:5）
        // 一般的なスマホ画面では横幅いっぱいに盤面が表示されることが多い
        const boardWidth = img.width * 1.0;
        const boardHeight = boardWidth * (5 / 6);

        // 盤面の開始位置（下揃え）
        // 画面下端から少し（高さの2%程度）浮いた位置に盤面があると仮定
        // これにより、縦長画面でも盤面位置をより正確に捉えられる
        const bottomMargin = img.height * 0.02;
        const startX = (img.width - boardWidth) / 2;
        const startY = img.height - boardHeight - bottomMargin;

        // グリッドサイズ
        const cellWidth = boardWidth / this.cols;
        const cellHeight = boardHeight / this.rows;

        const newBoard = [];

        for (let row = 0; row < this.rows; row++) {
            const newRow = [];
            for (let col = 0; col < this.cols; col++) {
                // 各セルの中心付近の色を取得
                const centerX = startX + col * cellWidth + cellWidth / 2;
                const centerY = startY + row * cellHeight + cellHeight / 2;

                // 中心周辺の平均色を取得（10x10ピクセル）
                const pixelData = ctx.getImageData(centerX - 5, centerY - 5, 10, 10).data;
                let r = 0, g = 0, b = 0;
                for (let i = 0; i < pixelData.length; i += 4) {
                    r += pixelData[i];
                    g += pixelData[i + 1];
                    b += pixelData[i + 2];
                }
                const count = pixelData.length / 4;
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                const type = this.detectOrbType(r, g, b);
                newRow.push(type);
            }
            newBoard.push(newRow);
        }

        // 盤面を更新
        this.board = newBoard;
        this.draw();
        alert('画像を読み込みました。盤面が正しくない場合は「盤面編集モード」で修正してください。');

        // 入力をリセットして同じファイルを再度読み込めるようにする
        document.getElementById('board-image-input').value = '';
    }

    detectOrbType(r, g, b) {
        const [h, s, v] = this.rgbToHsv(r, g, b);

        // HSV & RGB ハイブリッド判定

        // 1. 闇 (Dark)
        // 特徴: 暗い、または紫 (RとBが高く、Gが低い)
        // 明度が極端に低い場合は無条件で闇
        if (v < 35) return 'dark';

        // 紫色判定: 色相が青紫〜赤紫、かつG成分がR, Bより低い
        // 明るすぎる紫(ピンク寄り)は回復に回すため、明度上限を設けるか、Gとの差を見る
        if ((h >= 230 && h <= 320) && r > g + 10 && b > g + 10) {
            // 彩度が低すぎるとグレー(お邪魔?)や回復の可能性。闇は彩度がそこそこある
            if (s > 20 && v < 85) return 'dark';
        }

        // 2. 回復 (Heal)
        // 特徴: ピンク (R > B > G)、白っぽい (高明度・低彩度)
        // 火との決定的な違いは「B成分の高さ」と「彩度の低さ」

        // 白っぽさ判定: 明度が非常に高く、彩度が低い
        if (v > 85 && s < 40) return 'heal';

        // ピンク色判定: 色相が赤〜マゼンタ、かつB成分がしっかりある
        // 火はB成分が非常に少ない
        if ((h >= 290 || h <= 20) && b > 100 && b > g) {
            return 'heal';
        }

        // 3. 火 (Fire)
        // 特徴: 鮮やかな赤 (R >> G, B)
        // 色相が赤付近で、彩度が高い
        if ((h >= 330 || h <= 30) && s >= 45) {
            // 念のためB成分が低めであることを確認 (回復との誤認防止)
            if (b < r * 0.8) return 'fire';
        }

        // 4. その他の色 (光、木、水)

        // 光 (黄): 色相が黄色
        if (h >= 35 && h <= 85) return 'light';

        // 木 (緑): 色相が緑
        if (h >= 90 && h <= 160) return 'wood';

        // 水 (青): 色相が青
        if (h >= 170 && h <= 260) return 'water';

        // フォールバック (判定漏れの場合の最終手段)
        // RGBの最大値を持つ成分で判定
        if (r > g && r > b) {
            // 赤系: 火か回復か闇
            if (b > g && b > r * 0.6) return 'heal'; // Bが多ければ回復
            return 'fire';
        }
        if (b > r && b > g) {
            // 青系: 水か闇
            if (r > g && r > b * 0.6) return 'dark'; // Rも多ければ闇
            return 'water';
        }
        if (g > r && g > b) return 'wood';

        // それでも決まらない場合 (黄色系など)
        if (r > 150 && g > 150) return 'light';

        return 'heal'; // デフォルト
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, v * 100];
    }

    displayRoute(route) {
        this.assistRoute = route.path;
        this.assistRouteProgress = 0;

        // アニメーションループを開始
        if (this.assistAnimationId) {
            cancelAnimationFrame(this.assistAnimationId);
        }

        const animate = () => {
            if (!this.assistRoute) return;

            // 進行状況を進める (速度調整: 0.1 = 1フレームあたり0.1ステップ進む)
            this.assistRouteProgress += 0.15;

            // 最後まで到達したら最初に戻る（少し待機してから）
            if (this.assistRouteProgress >= this.assistRoute.length + 5) {
                this.assistRouteProgress = 0;
            }

            this.draw();
            this.assistAnimationId = requestAnimationFrame(animate);
        };

        animate();
    }

    clearRoute() {
        this.assistRoute = null;
        if (this.assistAnimationId) {
            cancelAnimationFrame(this.assistAnimationId);
            this.assistAnimationId = null;
        }
        this.draw();
    }
}


window.addEventListener('DOMContentLoaded', () => {
    window.puzzleGame = new PuzzleGame();
});
