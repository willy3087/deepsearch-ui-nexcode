// Add this at the beginning of your script section
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

// Function to update logo based on theme
function updateLogo(theme) {
  logo.src = theme === 'dark' ? 'Jina - Dark.svg' : 'Jina - Light.svg';
}

// Check for saved theme preference or default to 'dark'
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = `${savedTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
updateLogo(savedTheme); // Set initial logo

// Theme toggle handler
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = `${newTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
  updateLogo(newTheme); // Update logo when theme changes
});

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');
  console.log(queryParam);
  
  if (queryParam) {
    if (messageInput) {
      messageInput.value = queryParam;
    }
  }
});

const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const errorMessage = document.getElementById('error-message');

const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key');
const toggleApiKeyBtn = document.getElementById('toggle-api-key');
const getApiKeyBtn = document.getElementById('get-api-key');

const BASE_ORIGIN = 'https://deepsearch.jina.ai';
let isLoading = false;
let abortController = null;
let existingMessages = []; // Array to store existing messages

// Update the API key dialog logic
const apiKeyDialog = document.getElementById('api-key-dialog');
const dialogCloseBtn = document.querySelector('.dialog-close');

toggleApiKeyBtn.addEventListener('click', () => {
  apiKeyDialog.style.display = 'flex';
});

dialogCloseBtn.addEventListener('click', () => {
  apiKeyDialog.style.display = 'none';
});

// Close dialog when clicking outside
apiKeyDialog.addEventListener('click', (e) => {
  if (e.target === apiKeyDialog) {
    apiKeyDialog.style.display = 'none';
  }
});

// Load saved API key
apiKeyInput.value = localStorage.getItem('api_key') || '';
getApiKeyBtn.style.display = apiKeyInput.value ? 'none' : 'block';
toggleApiKeyBtn.textContent = apiKeyInput.value ? 'Update API Key' : 'Add API Key';
saveApiKeyBtn.disabled = !apiKeyInput.value.trim();
apiKeyInput.addEventListener('input', () => {
  saveApiKeyBtn.disabled = !apiKeyInput.value.trim();
});

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('api_key', key);
    apiKeyDialog.style.display = 'none';
    getApiKeyBtn.style.display = 'none';
    toggleApiKeyBtn.textContent = 'Update API Key';
  }
});

sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearMessages); // Add clear button event listener
messageInput.addEventListener('keydown', (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

function clearMessages() {
  chatContainer.innerHTML = ''; // Clear the chat container
  existingMessages = []; // Clear the existing messages array
  abortController?.abort(); // Abort any ongoing requests
}

async function sendMessage() {
  const query = messageInput.value.trim();

  if (!query) return; // Don't send empty messages
  if (isLoading) return;

  errorMessage.textContent = ''; // Clear any previous errors
  abortController = new AbortController();
  isLoading = true;
  sendButton.disabled = true;
  let loadingIndicatorRemoved = false;


  displayMessage('user', query);
  existingMessages.push({ role: 'user', content: query }); // Add user message to existing messages
  messageInput.value = ''; // Clear the input

  const assistantMessageDiv = displayMessage('assistant', ''); // Create the main assistant message div
  const markdownDiv = document.createElement('div'); // create markdown div here
  markdownDiv.classList.add('markdown');
  assistantMessageDiv.appendChild(markdownDiv);

  let markdownContent = '';
  let thinkContent = '';
  let inThinkSection = false;
  let thinkSectionElement = null; // Store the think section element
  let thinkHeaderElement = null; // Store the think header element

  function renderMarkdown(text) {
    const { Marked } = globalThis.marked;
    const { markedHighlight } = globalThis.markedHighlight;
    const marked = new Marked(markedHighlight({
      emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
    })).use(markedFootnote());
    // Use marked.parse to convert Markdown to HTML
    const html = marked.parse(text);

    return html;
  }

  try {
    const payload = {
      messages: existingMessages,
      stream: true,
    };

    const headers = {
      'Content-Type': 'application/json',
    }
    if (localStorage.getItem('api_key')) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('api_key')}`;
    }

    const res = await fetch(`${BASE_ORIGIN}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errorResponse = await res.json().catch(() => ({}));
      const errorMsg = errorResponse.message || 'Unknown error occurred';
      
      // Remove the loading message
      assistantMessageDiv.remove();
      
      // Handle specific error status codes
      switch (res.status) {
        case 401:
          showErrorWithAction(
            'Invalid API key', 
            'Update API Key', 
            () => apiKeyDialog.style.display = 'flex'
          );
          break;
        case 402:
          showErrorWithAction(
            'Insufficient tokens', 
            'Purchase More Tokens', 
            () => window.open('https://jina.ai/api-dashboard/key-manager', '_blank')
          );
          break;
        case 429:
          showErrorWithAction(
            'Rate limit exceeded', 
            'Add API Key', 
            () => apiKeyDialog.style.display = 'flex'
          );
          break;
        default:
          // Show generic error as a message
          const errorMessageDiv = document.createElement('div');
          errorMessageDiv.classList.add('message', 'assistant-message');
          errorMessageDiv.textContent = `Error: ${errorMsg}`;
          chatContainer.appendChild(errorMessageDiv);
      }
      
      throw new Error(errorMsg);
    }

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let partialBrokenData = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            isLoading = false;
            sendButton.disabled = false;
            break;
          }

          if (value) {
            const streamData = decoder.decode(value);
            const events = streamData.split('\n\ndata:').filter(Boolean);

            events.forEach(event => {
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
                          thinkContentElement.style.display = 'none'; // Collapse
                          // Change header text to "Chain of thoughts"
                          if (thinkHeaderElement) {
                            thinkHeaderElement.textContent = 'Chain of thoughts (Click to toggle)';
                          }
                        }
                      } else {
                        thinkContent += tempContent;
                        if (thinkSectionElement) {
                          thinkSectionElement.querySelector('.think-content').textContent = thinkContent;
                          thinkSectionElement.querySelector('.think-content').style.display = 'block'; // Ensure it's visible while streaming
                        }
                        tempContent = "";
                      }
                    } else {
                      const thinkStartIndex = tempContent.indexOf("<think>");
                      if (thinkStartIndex !== -1) {
                        // Process markdown content before <think>
                        markdownContent += tempContent.substring(0, thinkStartIndex);
                        const markdownHTML = renderMarkdown(markdownContent);
                        markdownDiv.innerHTML = markdownHTML; // Update the markdown section

                        // Create and expand think section
                        inThinkSection = true;
                        thinkContent = "";
                        tempContent = tempContent.substring(thinkStartIndex + "<think>".length);
                        thinkSectionElement = createThinkSection(assistantMessageDiv); //Create think section.
                        thinkHeaderElement = thinkSectionElement.querySelector('.think-header'); // Get the header element
                        thinkSectionElement.querySelector('.think-content').textContent = thinkContent;
                        const thinkContentElement = thinkSectionElement.querySelector('.think-content');
                        thinkContentElement.style.display = 'block'; // Expand the think section when created
                        //change header text
                        if (thinkHeaderElement) {
                          thinkHeaderElement.textContent = 'Thinking... (Click to toggle)';
                        }

                      } else {
                        // Append to markdown content
                        markdownContent += tempContent;
                        const markdownHTML = renderMarkdown(markdownContent);
                        markdownDiv.innerHTML = markdownHTML; // Update the markdown section
                        tempContent = "";
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing full JSON:', e);
              }
            });
          }
        }

        // If there's remaining markdown content after streaming, render it
        if (markdownContent) {
          const markdownHTML = renderMarkdown(markdownContent);
          markdownDiv.innerHTML = markdownHTML;
        }

      }
    } else {
      const jsonResult = await res.json();
      if (jsonResult) {
        assistantMessageDiv.textContent = jsonResult.choices[0].message.content;
      } else {
        throw new Error('Empty response from server.');
      }
    }
     let assistantContent = assistantMessageDiv.textContent;
     existingMessages.push({role: 'assistant', content: assistantContent});

  } catch (error) {
    if (error.name !== 'AbortError') {
      let errorMsg = error instanceof Error ? error.message : String(error);
      if (!document.querySelector('.error-container')) {
        errorMessage.textContent = `Error: ${errorMsg}`;
      }
    } else {
      // Handle abort error (optional)
      if (assistantMessageDiv) {
        assistantMessageDiv.textContent = "Request cancelled.";
      }
    }
  } finally {
    isLoading = false;
    sendButton.disabled = false;
  }
}

// Add this new function to handle errors with actions
function showErrorWithAction(message, buttonText, onClick) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', 'assistant-message');
  
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  
  const errorText = document.createElement('span');
  errorText.textContent = message;
  
  const actionButton = document.createElement('button');
  actionButton.textContent = buttonText;
  actionButton.addEventListener('click', onClick);
  
  errorContainer.appendChild(errorText);
  errorContainer.appendChild(actionButton);
  messageDiv.appendChild(errorContainer);
  chatContainer.appendChild(messageDiv);
  
  scrollToBottom();
}

function displayMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message');
  messageDiv.classList.add(`${role}-message`);
  messageDiv.textContent = content; // Set the text content here

  if (role === 'assistant') {
    messageDiv.innerHTML = '<div class="loading-indicator">Loading...</div>'; // Initial loading indicator
  } else {
    messageDiv.textContent = content;
  }

  chatContainer.appendChild(messageDiv);
  // Apply text direction based on role for proper alignment
  if (role === 'user') {
    messageDiv.style.textAlign = 'right';
  } else {
    messageDiv.style.textAlign = 'left';
  }

  chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom
  return messageDiv; // Return the element for updating content later
}

function createThinkSection(messageDiv) {
  const thinkSection = document.createElement('div');
  thinkSection.classList.add('think-section');

  const thinkHeader = document.createElement('div');
  thinkHeader.classList.add('think-header');
  thinkHeader.textContent = 'Thinking... (Click to toggle)';
  thinkSection.appendChild(thinkHeader);

  const thinkContent = document.createElement('div');
  thinkContent.classList.add('think-content');
  thinkSection.appendChild(thinkContent);

  thinkHeader.addEventListener('click', () => {
    thinkHeader.classList.toggle('expanded');
    thinkContent.style.display = thinkContent.style.display === 'none' ? 'block' : 'none';
  });

  messageDiv.prepend(thinkSection);
  return thinkSection; // Return the created element
}

// Function to scroll to the bottom of the chat container
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Call scrollToBottom after each message is displayed
const originalDisplayMessage = displayMessage; // Store the original function

displayMessage = function (role, content) { // Override the function
  const messageDiv = originalDisplayMessage(role, content); // Call the original
  scrollToBottom(); // Scroll to bottom after displaying message
  return messageDiv;
};

// Scroll to the bottom initially
scrollToBottom();

//add the removeLoadingIndicator method.
function removeLoadingIndicator(messageDiv) {
  const loadingIndicator = messageDiv.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}


const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'childList') {
      scrollToBottom(); // Scroll when new nodes are added
    }
  });
});

// Configuration for the observer
const config = { childList: true, subtree: true };

// Start observing the chat container
observer.observe(chatContainer, config);