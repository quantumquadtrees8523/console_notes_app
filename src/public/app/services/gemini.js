class GeminiService {
    constructor() {
        this.apiKey = 'AIzaSyCdLvqfncIZIntED8oADuL0453BXeMlH0A';
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent';
    }

    async streamGenerateContent(prompt) {
        console.log(prompt);
        try {
            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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
            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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
