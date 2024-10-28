import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { text } = req.body;
    const speechFilePath = path.join(process.cwd(), 'public', 'speech.mp3');

    try {
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });

      // Convert the response to a Buffer
      const buffer = Buffer.from(await mp3Response.arrayBuffer());

      // Write the buffer to a file
      await fs.promises.writeFile(speechFilePath, buffer);

      // Send the file back to the client
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(buffer);
    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
