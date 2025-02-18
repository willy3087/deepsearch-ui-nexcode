
const scripts = [
    { type: 'style', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css' },
    { type: 'script', url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js' }
];

async function loadResource(resource) {
    return new Promise((resolve, reject) => {
        let element;
        if (resource.type === 'script') {
            element = document.createElement('script');
            element.src = resource.url;
        } else {
            element = document.createElement('link');
            element.rel = 'stylesheet';
            element.href = resource.url;
        }
        
        element.onload = () => resolve();
        element.onerror = () => reject();
        document.body.appendChild(element);
    });
}

async function initializeApp() {
    try {
        for (const resource of scripts) {
            await loadResource(resource);
        }
    } catch (error) {
        console.error('Failed to load resources:', error);
    }
}

// Start loading
initializeApp();