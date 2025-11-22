// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyBqsizSXHLqcWwRK5p1kdfQMEH-Ej4KVL4",
    authDomain: "puzzle-dragons-92fac.firebaseapp.com",
    projectId: "puzzle-dragons-92fac",
    storageBucket: "puzzle-dragons-92fac.firebasestorage.app",
    messagingSenderId: "380010728364",
    appId: "1:380010728364:web:edbef8a678b902047c4809",
    measurementId: "G-E0JVJJT5DP"
};

// Firebase初期化
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase initialized");
} catch (e) {
    console.warn("Firebase initialization failed. Make sure to update firebaseConfig in firebase-manager.js", e);
}

class FirebaseManager {
    constructor() {
        this.collectionName = 'scores';
        this.setupUI();
    }

    setupUI() {
        const rankingBtn = document.getElementById('ranking-btn');
        const modal = document.getElementById('ranking-modal');
        const closeBtn = document.getElementById('close-ranking');
        const tabNormal = document.getElementById('tab-normal');
        const tabTimeAttack = document.getElementById('tab-timeattack');

        if (rankingBtn) {
            rankingBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                this.loadRanking('normal'); // デフォルトは通常モード
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (tabNormal) {
            tabNormal.addEventListener('click', () => {
                tabNormal.classList.add('active');
                tabTimeAttack.classList.remove('active');
                this.loadRanking('normal');
            });
        }

        if (tabTimeAttack) {
            tabTimeAttack.addEventListener('click', () => {
                tabTimeAttack.classList.add('active');
                tabNormal.classList.remove('active');
                this.loadRanking('time_attack');
            });
        }

        // モーダル外クリックで閉じる
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async saveScore(name, score, mode = 'normal') {
        if (!db) {
            console.warn("Firebase DB not initialized");
            return;
        }

        try {
            await db.collection(this.collectionName).add({
                name: name,
                score: score,
                mode: mode,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Score saved!");
        } catch (e) {
            console.error("Error saving score: ", e);
            alert("スコアの保存に失敗しました。");
        }
    }

    async loadRanking(mode = 'normal') {
        const listElement = document.getElementById('ranking-list');
        if (!listElement) return;

        listElement.innerHTML = '<p style="text-align: center;">読み込み中...</p>';

        if (!db) {
            listElement.innerHTML = '<p style="text-align: center; color: #ff6b6b;">Firebase設定が完了していません。<br>firebase-manager.jsの設定を更新してください。</p>';
            return;
        }

        try {
            const querySnapshot = await db.collection(this.collectionName)
                .where('mode', '==', mode)
                .orderBy('score', 'desc')
                .limit(10)
                .get();

            if (querySnapshot.empty) {
                listElement.innerHTML = '<p style="text-align: center;">データがありません</p>';
                return;
            }

            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.2);"><th style="text-align: left; padding: 8px;">順位</th><th style="text-align: left; padding: 8px;">名前</th><th style="text-align: right; padding: 8px;">スコア</th></tr>';

            let rank = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                html += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <td style="padding: 8px;">${rank}</td>
                        <td style="padding: 8px;">${this.escapeHtml(data.name)}</td>
                        <td style="padding: 8px; text-align: right;">${data.score}</td>
                    </tr>
                `;
                rank++;
            });
            html += '</table>';
            listElement.innerHTML = html;

        } catch (e) {
            console.error("Error loading ranking: ", e);
            listElement.innerHTML = '<p style="text-align: center; color: #ff6b6b;">ランキングの読み込みに失敗しました</p>';
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }
}

// インスタンス化してグローバルに公開
window.addEventListener('DOMContentLoaded', () => {
    window.firebaseManager = new FirebaseManager();
});
