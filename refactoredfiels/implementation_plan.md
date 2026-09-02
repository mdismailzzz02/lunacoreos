# Performance Optimization Plan

The lag and slowness you're experiencing are caused by two major bottlenecks in the current architecture:

1. **API Spam (The "Laggy Fetching")**: Right now, as you scroll down the page, each individual image fires off its own HTTP request to the Supabase Edge Function to get a secure URL. If 30 images load at once, the browser fires 30 concurrent API calls. This overloads the network and freezes the UI.
2. **Heavy Images (The "Slow Render")**: R2 doesn't have an automatic thumbnail generator like Google Drive does. If you upload a 15MB RAW photo, the grid downloads all 15MB just to show a tiny square.

## Proposed Changes

### 1. Batch API Fetching [MODIFY `GooglePhotos.jsx`]
I will remove the `IntersectionObserver` from individual cards. Instead, when the grid loads a page of 50 files from the database, it will immediately make **ONE single batch API call** to `getR2PresignedBatch` to get all 50 secure URLs at once. This reduces network requests by 98% and eliminates the API lag.

### 2. Auto-Generate Thumbnails on Upload [MODIFY `api.js` & `GooglePhotos.jsx`]
I will implement a silent local Image Resizer that runs in the browser before upload. 
- When you drop an image into the Upload Queue, the browser will instantly draw it to an invisible canvas, shrink it to a lightweight 400px WebP, and save it as a base64 string directly into the `thumbnail_key` column in your Supabase database.
- The Vault Grid will check for this base64 thumbnail. If it exists, the image will load **instantly** without ever needing to hit the Cloudflare Edge Function for the grid view! The full 15MB R2 file will only be downloaded when you click the image to view it full screen.

## Verification Plan
- Verify that `GooglePhotos.jsx` loads images in batches.
- Upload a large image and confirm a tiny base64 string is saved to `thumbnail_key` and used in the grid.

> [!NOTE] 
> This will fix all *future* uploads to load instantly. For the files you already uploaded, the batch API fix will make them fetch much faster, but they will still be full-resolution. You can re-upload them to get the instant-load thumbnails!
