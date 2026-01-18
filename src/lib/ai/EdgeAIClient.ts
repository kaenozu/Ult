import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we are running in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface SentimentResult {
    label: string;
    score: number;
}

export class EdgeAIClient {
    private static instance: EdgeAIClient;
    private classifier: any = null;
    private isLocading: boolean = false;

    private constructor() { }

    public static getInstance(): EdgeAIClient {
        if (!EdgeAIClient.instance) {
            EdgeAIClient.instance = new EdgeAIClient();
        }
        return EdgeAIClient.instance;
    }

    public async loadModel() {
        if (this.classifier) return;
        if (this.isLocading) return;

        this.isLocading = true;
        try {
            // Using a small, fast model for edge inference
            console.log('EdgeAI: Loading model...');
            this.classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
            console.log('EdgeAI: Model loaded successfully.');
        } catch (error) {
            console.error('EdgeAI: Failed to load model', error);
            throw error;
        } finally {
            this.isLocading = false;
        }
    }

    public async analyze(text: string): Promise<SentimentResult[]> {
        if (!this.classifier) {
            await this.loadModel();
        }

        // "Panic Button" check: if text is too long, truncate it to avoid freezing
        const cleanText = text.slice(0, 500);

        const result = await this.classifier(cleanText);
        // Transformers.js returns an array of objects { label: 'POSITIVE', score: 0.99 }
        return result;
    }

    public terminate() {
        // In a web worker this would terminate the worker.
        // For main thread, we just nullify the classifier to free memory if GC kicks in
        this.classifier = null;
        this.isLocading = false;
        console.warn('EdgeAI: Terminated.');
    }
}
