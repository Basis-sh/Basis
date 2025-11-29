/**
 * Scan Tool - The Visual Cortex Logic
 * 
 * Image classification service using Cloudflare Workers AI.
 * Provides instant, edge-native image classification for AI Agents.
 */

import { keccak256, toHex } from "viem";
import { validateUrl } from "../utils/security";

/**
 * Classification Result
 */
export interface Classification {
  label: string;
  score: number;
}

/**
 * Image Classification Result
 */
export interface ImageClassificationResult {
  classifications: Classification[];
  image_hash: string;
  top_result: Classification;
  performance?: {
    validation_ms?: number;
    fetch_ms?: number;
    hashing_ms?: number;
    ai_inference_ms?: number;
    total_ms: number;
  };
}

/**
 * Cloudflare AI Binding Type
 */
export interface AIBinding {
  run: (
    model: string,
    inputs: { image: ArrayBuffer }
  ) => Promise<Array<{ label: string; score: number }>>;
}

/**
 * Classify Image - Run AI inference on an image
 * 
 * Logic:
 * 1. Fetch the image as ArrayBuffer
 * 2. Run Cloudflare AI model (@cf/microsoft/resnet-50)
 * 3. Extract top 3 predictions with confidence scores
 * 4. Hash the image for verification
 * 
 * @param imageUrl - URL of the image to classify
 * @param ai - Cloudflare AI binding instance
 * @returns Classification results with top 3 predictions and image hash
 * @throws Error if image fetch fails or classification fails
 */
export async function classifyImage(
  imageUrl: string,
  ai: AIBinding
): Promise<ImageClassificationResult> {
  const start = Date.now();
  let validationTime = 0;
  let fetchTime = 0;
  let hashingTime = 0;
  let aiInferenceTime = 0;

  // Security: Validate URL to prevent SSRF attacks
  const validationStart = Date.now();
  validateUrl(imageUrl);
  validationTime = Date.now() - validationStart;

  let imageBuffer: ArrayBuffer;
  let imageHash: string;

  try {
    // Step 1: Fetch the image
    const fetchStart = Date.now();
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Basis-Scan/1.0",
      },
    });
    fetchTime = Date.now() - fetchStart;

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Image not found (404): ${imageUrl}`);
      }
      throw new Error(
        `Failed to fetch image: HTTP ${response.status} ${response.statusText}`
      );
    }

    // Step 2: Validate content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(
        `Invalid content type: Expected image/*, got ${contentType || "unknown"}`
      );
    }

    // Step 3: Get image as ArrayBuffer
    imageBuffer = await response.arrayBuffer();

    // Validate image size (safety check)
    if (imageBuffer.byteLength === 0) {
      throw new Error("Image file is empty");
    }

    // Maximum image size: 10MB (Cloudflare AI limit)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image too large: ${imageBuffer.byteLength} bytes. Maximum size: ${MAX_IMAGE_SIZE} bytes`
      );
    }

    // Step 4: Hash the image for verification
    const hashingStart = Date.now();
    const imageHex = toHex(new Uint8Array(imageBuffer));
    imageHash = keccak256(imageHex);
    hashingTime = Date.now() - hashingStart;

    // Step 5: Run AI inference using Cloudflare Workers AI
    const aiStart = Date.now();
    const modelResults = await ai.run("@cf/microsoft/resnet-50", {
      image: imageBuffer,
    });
    aiInferenceTime = Date.now() - aiStart;

    // Validate AI results
    if (!Array.isArray(modelResults) || modelResults.length === 0) {
      throw new Error("AI model returned no results");
    }

    // Step 6: Extract top 3 predictions (sorted by score, descending)
    const sortedResults = modelResults
      .map((result) => ({
        label: result.label || "unknown",
        score: typeof result.score === "number" ? result.score : 0,
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 3); // Take top 3

    // Validate scores are in valid range [0, 1]
    const validatedResults = sortedResults.map((result) => ({
      label: result.label,
      score: Math.max(0, Math.min(1, result.score)), // Clamp to [0, 1]
    }));

    return {
      classifications: validatedResults,
      image_hash: imageHash,
      top_result: validatedResults[0],
      performance: {
        validation_ms: validationTime,
        fetch_ms: fetchTime,
        hashing_ms: hashingTime,
        ai_inference_ms: aiInferenceTime,
        total_ms: Date.now() - start,
      },
    };
  } catch (error: any) {
    // Re-throw with context if it's already our error
    if (error.message && error.message.includes("Image")) {
      throw error;
    }

    // Wrap other errors
    throw new Error(
      `Image classification failed: ${error?.message || "Unknown error"}`
    );
  }
}

