// --- SANITY PROJECT DETAILS ---
// IMPORTANT: Replace with your actual Sanity Project ID from Step 1
const SANITY_PROJECT_ID = 'yt47nqtyh'; 
const SANITY_DATASET = 'production'; // This is almost always 'production'

// --- HELPER FUNCTIONS ---

/**
 * Converts Sanity's rich text 'blockContent' to plain text for excerpts.
 * @param {Array} blocks - The array of block content from Sanity.
 * @returns {string} - The plain text content.
 */
function blocksToText(blocks) {
    if (!blocks) return "";
    return blocks
        .map(block => {
            if (block._type !== 'block' || !block.children) {
                return '';
            }
            return block.children.map(child => child.text).join('');
        })
        .join('\n\n');
}

/**
 * Creates a plain text excerpt from the block content.
 * @param {Array} blocks - The array of block content from Sanity.
 * @param {number} maxLength - The maximum length of the excerpt.
 * @returns {string} - The plain text excerpt.
 */
function createExcerpt(blocks, maxLength = 160) {
    const plainText = blocksToText(blocks);
    if (plainText.length <= maxLength) {
        return plainText;
    }
    return plainText.slice(0, maxLength).trim() + '...';
}

/**
 * Converts Sanity's rich text 'blockContent' to HTML.
 * WARNING: This is a simplified version for demonstration. For a real project, 
 * it's better to use a library like '@portabletext/to-html' to handle all cases securely.
 * @param {Array} blocks - The array of block content.
 * @returns {string} - The HTML content.
 */
function blocksToHtml(blocks) {
    if (!blocks) return "";
    let html = '';
    blocks.forEach(block => {
        if (block._type === 'block' && block.style === 'h2') {
            html += `<h2>${block.children.map(c => c.text).join('')}</h2>`;
        } else if (block._type === 'block') {
            html += `<p>${block.children.map(c => c.text).join('')}</p>`;
        }
        // This simple version doesn't handle images, lists, etc.
    });
    return html;
}


// --- API FETCHING LOGIC ---
const SANITY_API_URL = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${SANITY_DATASET}`;

// A global variable to hold the fetched articles
let articles = [];

async function fetchArticles() {
    // This is a GROQ query that tells Sanity what data we want
    const query = encodeURIComponent(`*[_type == "article"] | order(publishedAt desc) {
        title,
        "slug": slug.current,
        "imageUrl": mainImage.asset->url,
        publishedAt,
        body
    }`);
    
    try {
        const response = await fetch(`${SANITY_API_URL}?query=${query}`);
        const { result } = await response.json();
        if (!result) {
            console.error('No result from Sanity');
            return [];
        }
        articles = result; // Store articles globally
        return articles;
    } catch (error) {
        console.error('Failed to fetch articles from Sanity:', error);
        return [];
    }
}


// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('articlesList')) {
        initializeProfilePage();
    } else if (document.getElementById('articleContent')) {
        initializeArticlePage();
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
            
            const excerpt = createExcerpt(article.body);
            const formattedDate = new Date(article.publishedAt).toLocaleDateString('ar-JO', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            articleCard.innerHTML = `
                <img src="${article.imageUrl}?w=800&h=600&fit=crop" alt="${article.title}" class="card-image">
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

    const query = encodeURIComponent(`*[_type == "article" && slug.current == "${articleSlug}"][0]`);
    
    try {
        const response = await fetch(`${SANITY_API_URL}?query=${query}`);
        const { result: article } = await response.json();

        if (article) {
            document.title = article.title;
            const formattedDate = new Date(article.publishedAt).toLocaleDateString('ar-JO', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            const bodyHtml = blocksToHtml(article.body);
            // We need to query the image URL separately for a single document fetch
            const imageUrlQuery = encodeURIComponent(`*[_id == "${article.mainImage.asset._ref}"][0].url`);
            const imageUrlResponse = await fetch(`${SANITY_API_URL}?query=${imageUrlQuery}`);
            const { result: imageUrl } = await imageUrlResponse.json();


            articleContent.innerHTML = `
                <img src="${imageUrl}?w=1200&fit=max" alt="${article.title}" class="article-header-image">
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
    } catch (error) {
        console.error('Failed to fetch article:', error);
        articleContent.innerHTML = `<p>حدث خطأ أثناء تحميل المقال.</p>`;
    }
}