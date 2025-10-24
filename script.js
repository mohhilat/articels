// --- HELPER FUNCTIONS ---

function blocksToText(blocks) {
    if (!Array.isArray(blocks)) return "";
    return blocks.map(block => 
        block.children ? block.children.map(child => child.text).join('') : ''
    ).join('\n\n');
}

function createExcerpt(article, maxLength = 160) {
    // Handle both new 'body' structure and old 'content' string
    const plainText = article.body ? blocksToText(article.body) : (article.content || "");
    if (plainText.length <= maxLength) return plainText;
    return plainText.slice(0, maxLength).trim() + '...';
}

function blocksToHtml(blocks) {
    if (!Array.isArray(blocks)) return "";
    let html = '';
    blocks.forEach(block => {
        const style = block.style || 'normal';
        const text = block.children ? block.children.map(c => c.text).join('') : '';

        // Sanitize text to prevent HTML injection
        const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (style === 'h2') {
            html += `<h2>${sanitizedText}</h2>`;
        } else {
            html += `<p>${sanitizedText}</p>`;
        }
    });
    return html;
}

// --- API FETCHING LOGIC ---
let articles = [];

async function fetchArticles() {
    try {
        const response = await fetch('articles.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Sort articles by date, newest first
        result.sort((a, b) => new Date(b.publishedAt) - new Date(a, b));

        articles = result;
        return articles;
    } catch (error) {
        console.error('Failed to fetch local articles:', error);
        return [];
    }
}


// --- NEW: SETTINGS & PREFERENCES LOGIC ---

// --- NEW: Define the available fonts
// These keys match the [data-font="..."] attributes in the CSS
const FONT_OPTIONS = ['serif', 'naskh', 'sans', 'tajawal'];

// Applies the theme to the body and updates the button icon
function applyTheme(theme) {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (theme === 'dark') {
        document.body.dataset.theme = 'dark';
        if (themeToggleBtn) themeToggleBtn.innerText = '☀️';
    } else {
        document.body.dataset.theme = 'light';
        if (themeToggleBtn) themeToggleBtn.innerText = '🌙';
    }
}

// Applies the font preference to the body
function applyFont(fontKey) {
    // Default to 'serif' if fontKey is invalid
    if (!FONT_OPTIONS.includes(fontKey)) {
        fontKey = 'serif';
    }
    document.body.dataset.font = fontKey;
}

// Loads saved preferences from localStorage on page load
function loadPreferences() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedFont = localStorage.getItem('font') || 'serif'; // Default to serif (Amiri)
    applyTheme(savedTheme);
    applyFont(savedFont);
}


// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- NEW: Load preferences as soon as the DOM is ready
    loadPreferences();

    // Page-specific initialization
    if (document.getElementById('articlesList')) {
        initializeProfilePage();
    } else if (document.getElementById('articleContent')) {
        initializeArticlePage();
    }

    // --- NEW: Attach listeners for settings buttons (on all pages) ---
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const fontToggleBtn = document.getElementById('fontToggleBtn');

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.dataset.theme || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // --- UPDATED: Font button logic to cycle through options ---
    if (fontToggleBtn) {
        fontToggleBtn.addEventListener('click', () => {
            const currentFont = document.body.dataset.font || 'serif';
            
            // Find the index of the current font
            const currentIndex = FONT_OPTIONS.indexOf(currentFont);
            
            // Get the next font, wrapping around to the beginning
            const nextIndex = (currentIndex + 1) % FONT_OPTIONS.length;
            const newFont = FONT_OPTIONS[nextIndex];
            
            applyFont(newFont);
            localStorage.setItem('font', newFont);
        });
    }
});

// --- PROFILE PAGE LOGIC (index.html) ---
async function initializeProfilePage() {
    const articlesList = document.getElementById('articlesList');
    const searchInput = document.getElementById('searchInput');
    articlesList.innerHTML = '<p>جاري تحميل المقالات...</p>';

    await fetchArticles();

    const displayArticles = (articlesToDisplay) => {
        articlesList.innerHTML = '';
        if (articlesToDisplay.length === 0) {
            articlesList.innerHTML = '<p>لم يتم العثور على مقالات.</p>';
            return;
        }

        articlesToDisplay.forEach(article => {
            const articleCard = document.createElement('a');
            articleCard.href = `article.html?id=${article.slug}`;
            articleCard.className = 'article-card';
            
            const excerpt = createExcerpt(article);
            const formattedDate = new Date(article.publishedAt).toLocaleDateString('ar-JO', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            articleCard.innerHTML = `
                <img src="${article.mainImage}" alt="${article.title}" class="card-image">
                <div class="card-content">
                    <h3>${article.title}</h3>
                    <p class="article-date">${formattedDate}</p>
                    <p class="article-excerpt">${excerpt}</p>
                </div>
            `;
            articlesList.appendChild(articleCard);
        });
    };

    displayArticles(articles);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredArticles = articles.filter(article =>
            article.title.toLowerCase().includes(query)
        );
        displayArticles(filteredArticles);
    });
}

// --- ARTICLE PAGE LOGIC (article.html) ---
async function initializeArticlePage() {
    const articleContent = document.getElementById('articleContent');
    const urlParams = new URLSearchParams(window.location.search);
    const articleSlug = urlParams.get('id');
    articleContent.innerHTML = '<p>جاري تحميل المقال...</p>';
    
    await fetchArticles();
    const article = articles.find(a => a.slug === articleSlug);

    if (article) {
        document.title = article.title;
        const formattedDate = new Date(article.publishedAt).toLocaleDateString('ar-JO', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        
        // Handle both body and content fields
        const bodyHtml = article.body ? blocksToHtml(article.body) : `<p>${article.content || ""}</p>`;

        articleContent.innerHTML = `
            <img src="${article.mainImage}" alt="${article.title}" class="article-header-image">
            <h1 class="article-title">${article.title}</h1>
            <p class="article-meta">نُشر في ${formattedDate}</p>
            <div class="article-body">
                ${bodyHtml}
            </div>
        `;
    } else {
        articleContent.innerHTML = `
            <h1 class="article-title">المقال غير موجود</h1>
            <p>المقال الذي تبحث عنه غير موجود. يرجى العودة إلى صفحة الملف الشخصي.</p>
        `;
    }
}