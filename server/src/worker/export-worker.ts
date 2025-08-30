import { Worker } from 'bullmq';
import { createCanvas, loadImage } from 'skia-canvas';
import * as fs from 'fs';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const worker = new Worker(
  'export-queue',
  async (job) => {
    console.log(`Processing export job ${job.id}`);
    
    const { projectData, format, width, height, quality } = job.data;
    
    try {
      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Clear background
      ctx.fillStyle = projectData.background || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Render layers (simplified)
      for (const layer of projectData.layers || []) {
        if (!layer.visible) continue;
        
        ctx.save();
        
        // Apply transforms
        ctx.globalAlpha = layer.opacity || 1;
        ctx.translate(layer.x || 0, layer.y || 0);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.scale(layer.scaleX || 1, layer.scaleY || 1);
        
        if (layer.type === 'TEXT') {
          // Render text
          const styles = layer.styles || {};
          ctx.font = `${styles.fontSize || 16}px ${styles.fontFamily || 'Arial'}`;
          ctx.fillStyle = styles.color || '#000000';
          ctx.fillText(layer.content || '', 0, 0);
        } else if (layer.type === 'IMAGE') {
          try {
            // Load and render image
            const image = await loadImage(layer.content);
            ctx.drawImage(image, 0, 0, layer.width || 100, layer.height || 100);
          } catch (error) {
            console.warn(`Failed to load image: ${layer.content}`);
          }
        }
        
        ctx.restore();
      }
      
      // Export to buffer
      let buffer;
      if (format === 'png') {
        buffer = canvas.toBuffer('png');
      } else if (format === 'jpeg') {
        buffer = canvas.toBuffer('jpeg', { quality: quality || 0.9 });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      // In a real implementation, upload to S3/R2 here
      const filename = `export-${job.id}.${format}`;
      const filepath = `/tmp/${filename}`;
      fs.writeFileSync(filepath, buffer);
      
      console.log(`Export job ${job.id} completed: ${filepath}`);
      
      return {
        success: true,
        fileUrl: `http://localhost:3000/exports/${filename}`,
        fileSize: buffer.length,
      };
      
    } catch (error) {
      console.error(`Export job ${job.id} failed:`, error);
      throw error;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with error: ${err.message}`);
});

console.log('Export worker started, waiting for jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});