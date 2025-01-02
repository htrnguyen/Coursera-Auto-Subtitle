// ==UserScript==
// @name         Coursera Auto Subtitle
// @namespace    https://github.com/htrnguyen/Coursera-Auto-Subtitle
// @version      2.3
// @description  Automatically enables, enhances, and translates subtitles on Coursera. Features include a draggable icon, customizable language selection, and real-time translation using Google Translate.
// @author       Hà Trọng Nguyễn (htrnguyen)
// @match        https://www.coursera.org/learn/*
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        translateSubtitles: true,
        maxRetries: 3,
        retryDelay: 1000,
    };

    let isSubtitlesEnabled = false;
    let subtitleDisplayElement = null;
    let targetLanguage = 'vi';

    const LANGUAGES = {
        vi: 'Tiếng Việt',
        en: 'English',
        zh: '中文 (简体)',
        ja: '日本語',
        ko: '한국어',
        fr: 'Français',
    };

    function createDraggableIcon() {
        const icon = document.createElement('div');
        icon.textContent = '📜';
        icon.style.position = 'fixed';
        icon.style.bottom = '20px';
        icon.style.right = '20px';
        icon.style.zIndex = '9999';
        icon.style.cursor = 'pointer';
        icon.style.fontSize = '24px';
        icon.style.userSelect = 'none';
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.textAlign = 'center';

        let isDragging = false;
        let offsetX, offsetY;

        icon.addEventListener('mousedown', (event) => {
            isDragging = true;
            offsetX = event.clientX - icon.getBoundingClientRect().left;
            offsetY = event.clientY - icon.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (event) => {
            if (isDragging) {
                icon.style.left = `${event.clientX - offsetX}px`;
                icon.style.top = `${event.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        icon.addEventListener('click', (event) => {
            event.stopPropagation();
            showMenu(icon);
        });

        document.body.appendChild(icon);
    }

    function showMenu(icon) {
        const existingMenu = document.querySelector('.subtitle-menu');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.classList.add('subtitle-menu');
        menu.style.position = 'absolute';
        menu.style.top = '0';
        menu.style.left = '30px';
        menu.style.backgroundColor = 'white';
        menu.style.border = '1px solid #ccc';
        menu.style.borderRadius = '5px';
        menu.style.padding = '10px';
        menu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        menu.style.zIndex = '10000';
        menu.style.width = '180px';

        const toggleButton = document.createElement('button');
        toggleButton.textContent = isSubtitlesEnabled ? 'Tắt Phụ Đề' : 'Bật Phụ Đề';
        toggleButton.style.display = 'block';
        toggleButton.style.width = '100%';
        toggleButton.style.marginBottom = '10px';
        toggleButton.style.padding = '8px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontSize = '14px';

        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation();
            isSubtitlesEnabled = !isSubtitlesEnabled;
            toggleButton.textContent = isSubtitlesEnabled ? 'Tắt Phụ Đề' : 'Bật Phụ Đề';
            if (isSubtitlesEnabled) {
                enableSubtitles();
            } else {
                disableSubtitles();
            }
            menu.remove();
        });

        const languageSelect = document.createElement('select');
        languageSelect.style.display = 'block';
        languageSelect.style.width = '100%';
        languageSelect.style.padding = '8px';
        languageSelect.style.cursor = 'pointer';
        languageSelect.style.fontSize = '14px';

        for (const [code, name] of Object.entries(LANGUAGES)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            if (code === targetLanguage) option.selected = true;
            languageSelect.appendChild(option);
        }

        languageSelect.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        languageSelect.addEventListener('change', (event) => {
            event.stopPropagation();
            targetLanguage = event.target.value;
            if (isSubtitlesEnabled) {
                handleSubtitles();
            }
        });

        menu.appendChild(toggleButton);
        menu.appendChild(languageSelect);
        icon.appendChild(menu);

        document.addEventListener('click', (event) => {
            if (!menu.contains(event.target) && !icon.contains(event.target)) {
                menu.remove();
            }
        });
    }

    function enableSubtitles() {
        if (!subtitleDisplayElement) {
            createSubtitleDisplay();
        }
        subtitleDisplayElement.style.display = 'block';
        handleSubtitles();
    }

    function disableSubtitles() {
        if (subtitleDisplayElement) {
            subtitleDisplayElement.style.display = 'none';
        }
    }

    function createSubtitleDisplay() {
        subtitleDisplayElement = document.createElement('div');
        subtitleDisplayElement.style.position = 'absolute';
        subtitleDisplayElement.style.bottom = '20px';
        subtitleDisplayElement.style.left = '50%';
        subtitleDisplayElement.style.transform = 'translateX(-50%)';
        subtitleDisplayElement.style.color = 'white';
        subtitleDisplayElement.style.fontSize = '16px';
        subtitleDisplayElement.style.zIndex = '10000';
        subtitleDisplayElement.style.textAlign = 'center';
        subtitleDisplayElement.style.maxWidth = '80%';
        subtitleDisplayElement.style.whiteSpace = 'pre-wrap';
        subtitleDisplayElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        subtitleDisplayElement.style.padding = '10px';
        subtitleDisplayElement.style.borderRadius = '5px';

        const videoElement = document.querySelector('video.vjs-tech');
        if (videoElement) {
            videoElement.parentElement.appendChild(subtitleDisplayElement);
        }
    }

    async function translateSubtitles(text, targetLang) {
        return new Promise((resolve, reject) => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            resolve(data[0][0][0]);
                        } else {
                            reject('Translation failed: No translated text');
                        }
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(error);
                },
            });
        });
    }

    async function handleSubtitles() {
        const videoElement = document.querySelector('video.vjs-tech');
        if (!videoElement) return;

        const tracks = videoElement.textTracks;
        if (!tracks || tracks.length === 0) return;

        const track = tracks[0];
        track.mode = 'hidden';

        track.oncuechange = () => {
            const activeCue = track.activeCues[0];
            if (activeCue && isSubtitlesEnabled) {
                const originalText = activeCue.text;

                if (CONFIG.translateSubtitles && originalText) {
                    translateSubtitles(originalText, targetLanguage)
                        .then((translatedText) => {
                            if (subtitleDisplayElement) {
                                subtitleDisplayElement.textContent = translatedText;
                            }
                        })
                        .catch(() => {});
                }
            }
        };
    }

    window.addEventListener('load', () => {
        createDraggableIcon();
    });
})();
