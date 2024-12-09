class GeminiService {
    constructor() {
        this.apiKey = 'AIzaSyCdLvqfncIZIntED8oADuL0453BXeMlH0A';
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent';
        this.maxRetries = 5;
        this.baseDelay = 1000; // 1 second
    }

    async fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                if (retryCount < this.maxRetries) {
                    const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), 32000);
                    console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.fetchWithRetry(url, options, retryCount + 1);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = Math.min(this.baseDelay * Math.pow(2, retryCount), 32000);
                console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    async streamGenerateContent(prompt) {
        console.log(prompt);
        try {
            const response = await this.fetchWithRetry(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.body) {
                throw new Error('Response body is null');
            }

            return response.body;
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }

    async generateContent(prompt) {
        try {
            const response = await this.fetchWithRetry(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }
}

const geminiService = new GeminiService();
export default geminiService;
