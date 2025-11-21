// パズル&ドラゴンズ風パズルゲーム

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
            fire: { gradient: ['#ff6b6b', '#ff4757'], glow: '#ff4757' },
            water: { gradient: ['#4facfe', '#00f2fe'], glow: '#00f2fe' },
            wood: { gradient: ['#38ef7d', '#11998e'], glow: '#38ef7d' },
            light: { gradient: ['#ffd89b', '#ffb347'], glow: '#ffd89b' },
            dark: { gradient: ['#667eea', '#764ba2'], glow: '#667eea' },
            heal: { gradient: ['#fa709a', '#fee140'], glow: '#fa709a' }
        };
        
        // ゲーム状態
        this.board = [];
        this.selectedOrb = null;
        this.isDragging = false;
        this.dragPath = [];
        this.score = 0;
        this.combo = 0;
        this.moveStartTime = 0;
        this.maxMoveTime = 5000; // 5秒
        
        // 利用可能なドロップタイプ
        this.availableOrbTypes = ['fire', 'water', 'wood', 'light', 'dark'];
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.initBoard();
        this.draw();
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = Math.min(container.clientWidth, 600);
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerWidth * (this.rows / this.cols);
        
        this.orbSize = (this.canvas.width - this.padding * 2) / this.cols;
    }
    
    setupEventListeners() {
        // マウスイベント
        this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleEnd.bind(this));
        
        // タッチイベント
        this.canvas.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this.handleEnd.bind(this));
        
        // ドロップタイプ選択
        document.querySelectorAll('.orb-option input').forEach(checkbox => {
            checkbox.addEventListener('change', this.updateAvailableOrbs.bind(this));
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
            this.score = 0;
            this.updateScore();
            this.draw();
        });
        
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
            // 最低1つは選択されている必要がある
            document.querySelector('.orb-option input').checked = true;
            this.availableOrbTypes = [document.querySelector('.orb-option input').value];
        }
        
        this.initBoard();
        this.draw();
    }
    
    initBoard() {
        this.board = [];
        for (let row = 0; row < this.rows; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col] = this.getRandomOrbType();
            }
        }
    }
    
    getRandomOrbType() {
        const randomIndex = Math.floor(Math.random() * this.availableOrbTypes.length);
        return this.availableOrbTypes[randomIndex];
    }
    
    getCanvasPosition(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    getOrbFromPosition(x, y) {
        const col = Math.floor((x - this.padding) / this.orbSize);
        const row = Math.floor((y - this.padding) / this.orbSize);
        
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            return { row, col };
        }
        return null;
    }
    
    handleStart(event) {
        const pos = this.getCanvasPosition(event);
        const orb = this.getOrbFromPosition(pos.x, pos.y);
        
        if (orb) {
            this.isDragging = true;
            this.selectedOrb = orb;
            this.dragPath = [{ ...orb }];
            this.moveStartTime = Date.now();
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    handleMove(event) {
        if (!this.isDragging || !this.selectedOrb) return;
        
        const pos = this.getCanvasPosition(event);
        const orb = this.getOrbFromPosition(pos.x, pos.y);
        
        if (orb && (orb.row !== this.selectedOrb.row || orb.col !== this.selectedOrb.col)) {
            // ドロップを交換
            const temp = this.board[this.selectedOrb.row][this.selectedOrb.col];
            this.board[this.selectedOrb.row][this.selectedOrb.col] = this.board[orb.row][orb.col];
            this.board[orb.row][orb.col] = temp;
            
            this.dragPath.push({ ...orb });
            this.selectedOrb = orb;
        }
        
        this.draw();
        this.drawDragPath();
    }
    
    handleEnd(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.selectedOrb = null;
        this.dragPath = [];
        this.canvas.style.cursor = 'pointer';
        
        // 連鎖をチェックして消去
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
            
            // マッチしたドロップを消去
            await this.clearMatches(matches);
            
            // ドロップを落下
            await this.dropOrbs();
            
            // 新しいドロップを補充
            this.fillBoard();
            
            this.draw();
            await this.sleep(300);
        }
        
        if (totalCombo > 0) {
            this.combo = totalCombo;
            this.score += totalCombo * 100;
            this.updateScore();
            this.animateCombo();
        }
    }
    
    findMatches() {
        const matches = [];
        const visited = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        
        // 横方向のマッチをチェック
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols - 2; col++) {
                const type = this.board[row][col];
                if (!type) continue;
                
                let matchLength = 1;
                let matchCols = [col];
                
                for (let c = col + 1; c < this.cols && this.board[row][c] === type; c++) {
                    matchLength++;
                    matchCols.push(c);
                }
                
                if (matchLength >= 3) {
                    const match = matchCols.map(c => ({ row, col: c, type }));
                    matches.push(match);
                    matchCols.forEach(c => visited[row][c] = true);
                }
            }
        }
        
        // 縦方向のマッチをチェック
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows - 2; row++) {
                const type = this.board[row][col];
                if (!type) continue;
                
                let matchLength = 1;
                let matchRows = [row];
                
                for (let r = row + 1; r < this.rows && this.board[r][col] === type; r++) {
                    matchLength++;
                    matchRows.push(r);
                }
                
                if (matchLength >= 3) {
                    const match = matchRows.map(r => ({ row: r, col, type }));
                    matches.push(match);
                    matchRows.forEach(r => visited[r][col] = true);
                }
            }
        }
        
        return matches;
    }
    
    async clearMatches(matches) {
        for (const match of matches) {
            for (const orb of match) {
                this.createParticles(orb.row, orb.col, orb.type);
                this.board[orb.row][orb.col] = null;
            }
        }
        
        this.draw();
        await this.sleep(200);
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
        // 背景をクリア
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ドロップを描画
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const type = this.board[row][col];
                if (!type) continue;
                
                const x = this.padding + col * this.orbSize;
                const y = this.padding + row * this.orbSize;
                
                this.drawOrb(x, y, type, this.orbSize);
            }
        }
        
        // 選択中のドロップをハイライト
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
    }
    
    drawOrb(x, y, type, size) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 2 - 5;
        
        // グラデーション
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
        
        // 影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 4;
        
        // ドロップ本体
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 影をリセット
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // ハイライト
        const highlightGradient = this.ctx.createRadialGradient(
            centerX - radius / 3,
            centerY - radius / 3,
            0,
            centerX - radius / 3,
            centerY - radius / 3,
            radius / 2
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX - radius / 4, centerY - radius / 4, radius / 2, 0, Math.PI * 2);
        this.ctx.fill();
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
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});
