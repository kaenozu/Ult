
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.2';

// Skip local checks since we are using CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

class SentimentAnalysisPipeline {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { text } = event.data;

    try {
        // Initial ping to say we are alive
        self.postMessage({ status: 'alive' });

        const classifier = await SentimentAnalysisPipeline.getInstance((data) => {
            self.postMessage({ status: 'progress', data });
        });

        const output = await classifier(text);

        self.postMessage({
            status: 'complete',
            result: output,
        });

    } catch (error) {
        self.postMessage({
            status: 'error',
            error: error.message || String(error)
        });
    }
});
