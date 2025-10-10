document.addEventListener('DOMContentLoaded', () => {
    const jsonEditor = document.getElementById('jsonEditor');
    const copyButton = document.getElementById('copyButton');
    const statusMessage = document.getElementById('statusMessage');

    // Fetch the current articles to populate the editor
    async function loadArticles() {
        try {
            const response = await fetch('articles.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const articles = await response.json();
            
            // Format the JSON with indentation for readability and display it
            jsonEditor.value = JSON.stringify(articles, null, 2); 
        } catch (error) {
            console.error('Failed to load articles:', error);
            jsonEditor.value = 'حدث خطأ أثناء تحميل الملف. تأكد من أن ملف articles.json موجود.';
        }
    }

    // Copy the updated content to the clipboard
    copyButton.addEventListener('click', () => {
        try {
            // First, try to parse the JSON to make sure it's valid
            JSON.parse(jsonEditor.value);
            
            // If it's valid, copy to clipboard
            navigator.clipboard.writeText(jsonEditor.value).then(() => {
                statusMessage.textContent = 'تم النسخ بنجاح! الصق المحتوى في ملف articles.json.';
                statusMessage.style.color = 'green';
            }, () => {
                statusMessage.textContent = 'فشل النسخ.';
                statusMessage.style.color = 'red';
            });
        } catch (error) {
            // If the JSON is not valid
            statusMessage.textContent = `خطأ في تنسيق JSON: ${error.message}. يرجى تصحيحه قبل النسخ.`;
            statusMessage.style.color = 'red';
        }
    });

    loadArticles();
});