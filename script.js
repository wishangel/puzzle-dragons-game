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
    }

    setupEventListeners() {
        // マウスイベント
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleInputEnd());
        this.canvas.addEventListener('mouseleave', () => this.handleInputEnd());

        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleInputMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleInputEnd());

        // ドロップタイプ選択
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

    handleInputStart(e) {
        e.preventDefault();
        const pos = this.getPointerPos(e);
        const col = Math.floor((pos.x - this.padding) / this.orbSize);
        const row = Math.floor((pos.y - this.padding) / this.orbSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            // 通常モードなら操作開始時にスコアをリセット
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

            // BGM再生開始
            if (this.bgmEnabled && this.bgm && this.bgm.paused) {
                this.playBGM();
            }

            this.canvas.style.cursor = 'grabbing';
            this.playSound('move');
            this.draw();
        }
    }

    handleInputMove(e) {
        if (!this.isDragging || !this.selectedOrb) return;
        e.preventDefault();

        if (Date.now() - this.moveStartTime > this.maxMoveTime) {
            this.handleInputEnd();
            return;
        }

        const pos = this.getPointerPos(e);
        const col = Math.floor((pos.x - this.padding) / this.orbSize);
        const row = Math.floor((pos.y - this.padding) / this.orbSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const currentOrb = this.selectedOrb;

            if (Math.abs(col - currentOrb.col) + Math.abs(row - currentOrb.row) === 1) {
                const temp = this.board[row][col];
                this.board[row][col] = this.board[currentOrb.row][currentOrb.col];
                this.board[currentOrb.row][currentOrb.col] = temp;

                this.selectedOrb = { row, col };
                this.dragPath.push({ row, col });
                this.playSound('move');
                this.draw();
            }
        }
    }

    handleInputEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.selectedOrb = null;
        this.dragPath = [];
        this.canvas.style.cursor = 'pointer';

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

        for (let row = 0; row < this.rows; row++) {
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
}

window.addEventListener('DOMContentLoaded', () => {
    window.puzzleGame = new PuzzleGame();
});
