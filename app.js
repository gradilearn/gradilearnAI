/* ==================================================
   NIHONGO PARTNER AI
   APP.JS
================================================== */

/* ==================================================
   ELEMENTS
================================================== */

const chatContainer =
    document.getElementById("chatContainer");

const statusText =
    document.getElementById("statusText");

const micButton =
    document.getElementById("micButton");

const clearChatBtn =
    document.getElementById("clearChatBtn");

const repeatBtn =
    document.getElementById("repeatBtn");

const sendBtn =
    document.getElementById("sendBtn");

const manualMessage =
    document.getElementById("manualMessage");

const loadingOverlay =
    document.getElementById("loadingOverlay");

/* ==================================================
   STORAGE
================================================== */

const STORAGE_KEY =
    "nihongo_partner_chat";

const SETTINGS_KEY =
    "nihongo_partner_settings";

/* ==================================================
   GLOBAL
================================================== */

let lastAIResponse = "";

let recognition = null;

let isListening = false;

/* ==================================================
   SYSTEM PROMPT
================================================== */

const SYSTEM_PROMPT = `
Anda adalah Nihongo Partner.

Anda adalah partner percakapan bahasa Jepang
untuk orang Indonesia.

Aturan:

1. Gunakan bahasa Jepang level N4–N3.
2. Fokus pada percakapan sehari-hari.
3. Fokus pada percakapan lingkungan kerja Jepang.
4. Hindari kosakata yang terlalu sulit.
5. Hindari grammar N2–N1 kecuali diperlukan.
6. Jawaban maksimal 3 kalimat.
7. Bersikap ramah dan natural.
8. Selalu lanjutkan percakapan dengan pertanyaan.
9. Berperan seperti teman Jepang yang sedang mengobrol.

Setelah menjawab tampilkan format:

【Koreksi】

(Tampilkan jika ada kesalahan grammar)

【Romaji】

(Romaji dari jawaban AI)

【Indonesia】

(Terjemahan bahasa Indonesia)
`;

/* ==================================================
   STATUS
================================================== */

function setStatus(text) {
    statusText.textContent = text;
}

/* ==================================================
   LOADING
================================================== */

function showLoading() {
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

/* ==================================================
   CHAT
================================================== */

function addMessage(sender, text) {

    const wrapper =
        document.createElement("div");

    wrapper.classList.add("message");

    if (sender === "AI") {
        wrapper.classList.add("ai");
    } else {
        wrapper.classList.add("user");
    }

    wrapper.innerHTML = `
        <div class="sender">
            ${sender}
        </div>

        <div class="bubble">
            ${escapeHtml(text)}
        </div>
    `;

    chatContainer.appendChild(wrapper);

    scrollToBottom();

    saveChat();
}

function scrollToBottom() {
    chatContainer.scrollTop =
        chatContainer.scrollHeight;
}

/* ==================================================
   HTML ESCAPE
================================================== */

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

/* ==================================================
   SAVE CHAT
================================================== */

function saveChat() {

    localStorage.setItem(
        STORAGE_KEY,
        chatContainer.innerHTML
    );

}

function loadChat() {

    const data =
        localStorage.getItem(STORAGE_KEY);

    if (!data) return;

    chatContainer.innerHTML = data;

    scrollToBottom();
}

/* ==================================================
   CLEAR CHAT
================================================== */

function clearChat() {

    if (
        !confirm(
            "Hapus seluruh percakapan?"
        )
    ) {
        return;
    }

    chatContainer.innerHTML = "";

    localStorage.removeItem(
        STORAGE_KEY
    );

    addMessage(
        "AI",
        "こんにちは。日本語を練習しましょう。"
    );

}

clearChatBtn.addEventListener(
    "click",
    clearChat
);

/* ==================================================
   MANUAL SEND
================================================== */

sendBtn.addEventListener(
    "click",
    () => {

        const text =
            manualMessage.value.trim();

        if (!text) return;

        manualMessage.value = "";

        processUserMessage(text);

    }
);

/* ==================================================
   SPEECH RECOGNITION
================================================== */

function initSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        alert(
            "Browser tidak mendukung Speech Recognition."
        );

        return;
    }

    recognition =
        new SpeechRecognition();

    recognition.lang = "ja-JP";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    recognition.onstart = () => {

        isListening = true;

        setStatus("Mendengarkan...");

    };

    recognition.onresult = (event) => {

        const transcript =
            event.results[0][0].transcript;

        processUserMessage(
            transcript
        );

    };

    recognition.onerror = () => {

        isListening = false;

        setStatus("Siap");

    };

    recognition.onend = () => {

        isListening = false;

        setStatus("Siap");

    };

}

/* ==================================================
   MIC BUTTON
================================================== */

micButton.addEventListener(
    "click",
    () => {

        if (!recognition) {
            initSpeechRecognition();
        }

        if (isListening) {
            recognition.stop();
            return;
        }

        recognition.start();

    }
);

/* ==================================================
   USER MESSAGE
================================================== */

async function processUserMessage(text) {

    addMessage(
        "Anda",
        text
    );

    setStatus(
        "Memproses..."
    );

    showLoading();

    try {

        const response =
            await sendToGemini(text);

        addMessage(
            "AI",
            response
        );

        lastAIResponse =
            response;

        speakJapanese(
            extractJapaneseText(
                response
            )
        );

    } catch (error) {

        console.error(error);

        addMessage(
            "AI",
            "Maaf, terjadi kesalahan."
        );

    }

    hideLoading();

    setStatus(
        "Siap"
    );
}

/* ==================================================
   REPEAT VOICE
================================================== */

repeatBtn.addEventListener(
    "click",
    () => {

        if (!lastAIResponse) return;

        speakJapanese(
            extractJapaneseText(
                lastAIResponse
            )
        );

    }
);

/* ==================================================
   JAPANESE ONLY
================================================== */

function extractJapaneseText(text) {

    const split =
        text.split("【");

    return split[0].trim();

}

/* ==================================================
   GEMINI API
================================================== */

async function sendToGemini(message) {

    setStatus("AI Sedang Menjawab...");

    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text:
                            SYSTEM_PROMPT +
                            "\n\nPesan pengguna:\n" +
                            message
                    }
                ]
            }
        ],

        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 500
        }
    };

    const response =
        await fetch(endpoint, {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify(payload)
        });

    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(errorText);
    }

    const data =
        await response.json();

    if (
        !data.candidates ||
        !data.candidates.length
    ) {
        throw new Error(
            "Tidak ada respons dari Gemini."
        );
    }

    return data.candidates[0]
        .content.parts[0].text;
}

/* ==================================================
   TEXT TO SPEECH
================================================== */

function speakJapanese(text) {

    if (
        !window.speechSynthesis
    ) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    utterance.lang =
        "ja-JP";

    utterance.rate = 0.95;

    utterance.pitch = 1;

    const voices =
        speechSynthesis.getVoices();

    const japaneseVoice =
        voices.find(
            voice =>
                voice.lang
                    .toLowerCase()
                    .includes("ja")
        );

    if (japaneseVoice) {
        utterance.voice =
            japaneseVoice;
    }

    speechSynthesis.speak(
        utterance
    );
}

/* ==================================================
   LOAD JAPANESE VOICES
================================================== */

if (
    window.speechSynthesis
) {

    speechSynthesis.onvoiceschanged =
        () => {

            speechSynthesis
                .getVoices();

        };

}

/* ==================================================
   RESTORE LAST AI MESSAGE
================================================== */

function restoreLastAIMessage() {

    const messages =
        document.querySelectorAll(
            ".message.ai .bubble"
        );

    if (
        messages.length === 0
    ) {
        return;
    }

    lastAIResponse =
        messages[
            messages.length - 1
        ].innerText;
}

/* ==================================================
   ENTER KEY
================================================== */

manualMessage.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendBtn.click();

        }

    }
);

/* ==================================================
   PWA
================================================== */

function registerServiceWorker() {

    if (
        "serviceWorker" in navigator
    ) {

        navigator.serviceWorker
            .register(
                "./service-worker.js"
            )
            .then(() => {

                console.log(
                    "Service Worker aktif"
                );

            })
            .catch(error => {

                console.error(
                    error
                );

            });

    }

}

/* ==================================================
   APP SETTINGS
================================================== */

function saveSettings(settings) {

    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
    );

}

function loadSettings() {

    const data =
        localStorage.getItem(
            SETTINGS_KEY
        );

    if (!data) {
        return {};
    }

    try {

        return JSON.parse(data);

    } catch {

        return {};

    }

}

/* ==================================================
   WELCOME MESSAGE
================================================== */

function initializeChat() {

    const saved =
        localStorage.getItem(
            STORAGE_KEY
        );

    if (saved) {

        loadChat();

        restoreLastAIMessage();

        return;
    }

    addMessage(
        "AI",
`こんにちは。

日本語の会話を練習しましょう。

今日は何をしましたか。

【Koreksi】
なし

【Romaji】
Konnichiwa.
Nihongo no kaiwa o renshuu shimashou.
Kyou wa nani o shimashita ka.

【Indonesia】
Halo.
Mari berlatih percakapan bahasa Jepang.
Hari ini Anda melakukan apa?`
    );

}

/* ==================================================
   NETWORK CHECK
================================================== */

window.addEventListener(
    "offline",
    () => {

        addMessage(
            "AI",
            "Koneksi internet terputus."
        );

    }
);

window.addEventListener(
    "online",
    () => {

        addMessage(
            "AI",
            "Koneksi internet kembali tersedia."
        );

    }
);

/* ==================================================
   DOM READY
================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeChat();

        initSpeechRecognition();

        registerServiceWorker();

        setStatus("Siap");

        console.log(
            CONFIG.APP_NAME +
            " siap digunakan."
        );

    }
);