
import { pipeline, Pipeline } from '@xenova/transformers';

// Skip local model checks for browser environment
// env.allowLocalModels = false;
// env.useBrowserCache = false;

class SentimentAnalysisPipeline {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance: Promise<Pipeline> | null = null;

    static async getInstance(progress_callback: (data: any) => void) {
        if (this.instance === null) {
            // @ts-ignore - pipeline types can be tricky
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { text } = event.data;

    try {
        const classifier = await SentimentAnalysisPipeline.getInstance((data: any) => {
            // Send progress back to main thread
            self.postMessage({ status: 'progress', data });
        });

        const output = await classifier(text);

        // Send result back
        self.postMessage({
            status: 'complete',
            result: output,
        });

    } catch (error) {
        self.postMessage({
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
