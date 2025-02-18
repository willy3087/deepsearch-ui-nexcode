// UI Strings
const UI_STRINGS = {
    buttons: {
        send: 'Deep Search',
        clear: 'Clear',
        addKey: 'Add API Key',
        updateKey: 'Update API Key',
        getKey: 'Get API Key',
        saveKey: 'Save',
        purchase: 'Purchase More Tokens',
    },
    dialog: {
        title: 'Add API Key',
        description: 'Enter your API key to access DeepSearch. You can get a key from the Jina AI dashboard.',
        placeholder: 'Enter your API key'
    },
    think: {
        initial: 'Thinking...',
        toggle: 'Chain of thoughts',
        loading: 'Loading...'
    },
    errors: {
        invalidKey: 'Invalid API key',
        insufficientTokens: 'Insufficient tokens',
        rateLimit: 'Rate limit exceeded'
    }
};

// DOM Elements - grouped at the top for better organization
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const errorMessage = document.getElementById('error-message');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const toggleApiKeyBtn = document.getElementById('toggle-api-key');
const getApiKeyBtn = document.getElementById('get-api-key');
const apiKeyDialog = document.getElementById('api-key-dialog');
const dialogCloseBtn = document.querySelector('.dialog-close');

// Constants
const BASE_ORIGIN = 'https://deepsearch.jina.ai';

// State variables
let isLoading = false;
let abortController = null;
let existingMessages = [];

// Theme management functions
function updateLogo(theme) {
  logo.src = `Jina - ${theme === 'dark' ? 'Dark' : 'Light'}.svg`;
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  // Show the opposite icon of current theme to indicate what you'll switch to
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌒';
  updateLogo(savedTheme);
}

// Initialize theme
initializeTheme();

// Theme toggle handler - fixed logic
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  // Show the opposite icon of new theme to indicate what you'll switch to next
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌒';
  updateLogo(newTheme);
});

// API Key Management
function initializeApiKey() {
  const savedKey = localStorage.getItem('api_key') || '';
  apiKeyInput.value = savedKey;
  getApiKeyBtn.style.display = savedKey ? 'none' : 'block';
  toggleApiKeyBtn.textContent = savedKey ? UI_STRINGS.buttons.updateKey : UI_STRINGS.buttons.addKey;
  saveApiKeyBtn.disabled = !savedKey.trim();
}

function handleApiKeySave() {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('api_key', key);
    apiKeyDialog.style.display = 'none';
    getApiKeyBtn.style.display = 'none';
    toggleApiKeyBtn.textContent = UI_STRINGS.buttons.updateKey;
  }
}

// Initialize API key
initializeApiKey();

// API Key Event Listeners
apiKeyInput.addEventListener('input', () => {
  saveApiKeyBtn.disabled = !apiKeyInput.value.trim();
});

toggleApiKeyBtn.addEventListener('click', () => {
  apiKeyDialog.style.display = 'flex';
});

dialogCloseBtn.addEventListener('click', () => {
  apiKeyDialog.style.display = 'none';
});

apiKeyDialog.addEventListener('click', (e) => {
  if (e.target === apiKeyDialog) {
    apiKeyDialog.style.display = 'none';
  }
});

saveApiKeyBtn.addEventListener('click', handleApiKeySave);

// Message display functions
function createThinkSection(messageDiv) {
  const thinkSection = document.createElement('div');
  thinkSection.classList.add('think-section');

  const thinkHeader = document.createElement('div');
  thinkHeader.classList.add('think-header');
  thinkHeader.appendChild(document.createTextNode(UI_STRINGS.think.initial));

  thinkSection.appendChild(thinkHeader);

  const thinkContent = document.createElement('div');
  thinkContent.classList.add('think-content');

  const expanded = localStorage.getItem('think_section_expanded') === 'true';
  if (expanded) {
    thinkContent.classList.add('expanded');
    thinkContent.style.display = 'block';
  } else {
    thinkContent.style.display = 'none';
  }

  thinkHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    thinkContent.classList.toggle('expanded');

    if (thinkContent.classList.contains('expanded')) {
      thinkHeader.classList.add('expanded');
      thinkHeader.classList.remove('collapsed');
    } else {
      thinkHeader.classList.remove('expanded');
      thinkHeader.classList.add('collapsed');
    }

    thinkContent.style.display = thinkContent.classList.contains('expanded') ? 'block' : 'none';
    localStorage.setItem('think_section_expanded', thinkContent.classList.contains('expanded'));
  });

  // thinkSection.appendChild(thinkHeader);
  thinkSection.appendChild(thinkContent);
  messageDiv.prepend(thinkSection);
  return thinkSection;
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function displayMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', `${role}-message`);

  if (role === 'assistant') {
    messageDiv.innerHTML = `<div class="loading-indicator">${UI_STRINGS.think.loading}</div>`;
  } else {
    messageDiv.textContent = content;
  }

  messageDiv.style.textAlign = role === 'user' ? 'right' : 'left';
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
  return messageDiv;
}

function removeLoadingIndicator(messageDiv) {
  const loadingIndicator = messageDiv.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

function showErrorWithAction(message, buttonText, onClick) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', 'assistant-message');

  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';

  const errorText = document.createElement('span');
  errorText.textContent = message;

  const actionButton = document.createElement('button');
  actionButton.textContent = buttonText;
  actionButton.className = 'action-button';
  actionButton.addEventListener('click', onClick);

  errorContainer.appendChild(errorText);
  errorContainer.appendChild(actionButton);
  messageDiv.appendChild(errorContainer);
  chatContainer.appendChild(messageDiv);

  scrollToBottom();
}

// Markdown rendering
function renderMarkdown(text) {
  const { Marked } = globalThis.marked;
  const { markedHighlight } = globalThis.markedHighlight;
  const marked = new Marked(
    markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })
  ).use(markedFootnote());

  return marked.parse(text);
}

// Message handling functions
function clearMessages() {
  chatContainer.innerHTML = '';
  existingMessages = [];
  abortController?.abort();
}

async function sendMessage() {
  const query = messageInput.value.trim();

  if (!query || isLoading) return;

  errorMessage.textContent = '';
  abortController = new AbortController();
  isLoading = true;
  sendButton.disabled = true;

  displayMessage('user', query);
  existingMessages.push({ role: 'user', content: query });
  messageInput.value = '';

  const assistantMessageDiv = displayMessage('assistant', '');
  const markdownDiv = document.createElement('div');
  markdownDiv.classList.add('markdown');
  assistantMessageDiv.appendChild(markdownDiv);

  let markdownContent = '';
  let thinkContent = '';
  let inThinkSection = false;
  let thinkSectionElement = null;
  let thinkHeaderElement = null;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const apiKey = localStorage.getItem('api_key');
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${BASE_ORIGIN}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: existingMessages,
        stream: true,
      }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errorResponse = await res.json().catch(() => ({}));
      const errorMsg = errorResponse.message || 'Unknown error occurred';

      assistantMessageDiv.remove();

      switch (res.status) {
        case 401:
          showErrorWithAction(
            UI_STRINGS.errors.invalidKey,
            UI_STRINGS.buttons.updateKey,
            () => apiKeyDialog.style.display = 'flex'
          );
          break;
        case 402:
          showErrorWithAction(
            UI_STRINGS.errors.insufficientTokens,
            UI_STRINGS.buttons.purchase,
            () => window.open('https://jina.ai/api-dashboard/key-manager?login=true', '_blank')
          );
          break;
        case 429:
          showErrorWithAction(
            UI_STRINGS.errors.rateLimit,
            UI_STRINGS.buttons.addKey,
            () => apiKeyDialog.style.display = 'flex'
          );
          break;
        default:
          const errorMessageDiv = document.createElement('div');
          errorMessageDiv.classList.add('message', 'assistant-message');
          errorMessageDiv.textContent = `Error: ${errorMsg}`;
          chatContainer.appendChild(errorMessageDiv);
      }

      throw new Error(errorMsg);
    }

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder();
      let partialBrokenData = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          const streamData = decoder.decode(value);
          const events = streamData.split('\n\ndata:').filter(Boolean);

          for (const event of events) {
            const data = event.replace(/data: /, '').trim();
            partialBrokenData += data;

            try {
              if (partialBrokenData) {
                const json = JSON.parse(partialBrokenData);
                partialBrokenData = '';
                const content = json.choices[0].delta.content;
                removeLoadingIndicator(assistantMessageDiv);

                let tempContent = content;
                while (tempContent.length > 0) {
                  if (inThinkSection) {
                    const thinkEndIndex = tempContent.indexOf("</think>");
                    if (thinkEndIndex !== -1) {
                      thinkContent += tempContent.substring(0, thinkEndIndex);
                      if (thinkSectionElement) {
                        thinkSectionElement.querySelector('.think-content').textContent = thinkContent;
                      }
                      inThinkSection = false;
                      tempContent = tempContent.substring(thinkEndIndex + "</think>".length);
                      if (thinkSectionElement) {
                        const thinkContentElement = thinkSectionElement.querySelector('.think-content');
                        thinkContentElement.style.display = 'none';
                        if (thinkHeaderElement) {
                          thinkHeaderElement.textContent = UI_STRINGS.think.toggle;
                        }
                      }
                    } else {
                      thinkContent += tempContent;
                      if (thinkSectionElement) {
                        const thinkContentElement = thinkSectionElement.querySelector('.think-content');
                        thinkContentElement.textContent = thinkContent;
                        thinkContentElement.style.display = 'block';
                      }
                      tempContent = "";
                    }
                  } else {
                    const thinkStartIndex = tempContent.indexOf("<think>");
                    if (thinkStartIndex !== -1) {
                      markdownContent += tempContent.substring(0, thinkStartIndex);
                      markdownDiv.innerHTML = renderMarkdown(markdownContent);

                      inThinkSection = true;
                      thinkContent = "";
                      tempContent = tempContent.substring(thinkStartIndex + "<think>".length);
                      thinkSectionElement = createThinkSection(assistantMessageDiv);
                      thinkHeaderElement = thinkSectionElement.querySelector('.think-header');
                      thinkSectionElement.querySelector('.think-content').textContent = thinkContent;
                      const thinkContentElement = thinkSectionElement.querySelector('.think-content');
                      thinkContentElement.style.display = 'block';

                      if (thinkHeaderElement) {
                        thinkHeaderElement.textContent = 'Thinking... (Click to toggle)';
                      }
                    } else {
                      markdownContent += tempContent;
                      markdownDiv.innerHTML = renderMarkdown(markdownContent);
                      tempContent = "";
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }

      if (markdownContent) {
        markdownDiv.innerHTML = renderMarkdown(markdownContent);
      }
    } else {
      const jsonResult = await res.json();
      if (jsonResult) {
        assistantMessageDiv.textContent = jsonResult.choices[0].message.content;
      } else {
        throw new Error('Empty response from server.');
      }
    }

    existingMessages.push({
      role: 'assistant',
      content: assistantMessageDiv.textContent
    });

  } catch (error) {
    if (error.name !== 'AbortError') {
      if (!document.querySelector('.error-container')) {
        errorMessage.textContent = `Error: ${error.message || String(error)}`;
      }
    } else {
      if (assistantMessageDiv) {
        assistantMessageDiv.textContent = "Request cancelled.";
      }
    }
  } finally {
    isLoading = false;
    sendButton.disabled = false;
  }
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearMessages);
messageInput.addEventListener('keydown', (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// URL Parameter handling
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');

  if (queryParam && messageInput) {
    messageInput.value = queryParam;
  }
});

// Auto-scroll setup
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      scrollToBottom();
    }
  });
});

observer.observe(chatContainer, { childList: true, subtree: true });
