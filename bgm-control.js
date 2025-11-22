// BGMトグルのイベントリスナーを追加
window.addEventListener('DOMContentLoaded', () => {
    const bgmToggle = document.getElementById('bgm-toggle');

    if (bgmToggle) {
        bgmToggle.addEventListener('change', (e) => {
            // PuzzleGameインスタンスはwindow.gameとして保存されていると仮定
            if (window.puzzleGame) {
                window.puzzleGame.toggleBGM();
            }
        });
    }
});
