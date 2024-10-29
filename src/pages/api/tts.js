import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { text } = req.body;

    try {
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });

      // Convert the response to a Buffer and directly send it without saving
      const buffer = Buffer.from(await mp3Response.arrayBuffer());

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
      res.status(200).send(buffer);

    } catch (error) {
      console.error('TTS Error:', error);
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
