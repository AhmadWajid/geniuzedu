import { NextResponse } from 'next/server';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(request) {
  try {
    const body = await request.json();
    const { videoId } = body;
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Try to fetch video details to get the title
    let videoTitle = '';
    try {
      // This uses a simple public API to get video info
      // For production, you might want to use YouTube Data API
      const videoInfoResponse = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      videoTitle = videoInfoResponse.data?.title || '';
    } catch (error) {
      console.error('Error fetching video title:', error);
      // Non-critical error, continue without the title
    }

    // Get transcript using youtube-transcript package
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId).catch(err => {
      console.error('YouTube transcript error:', err);
      throw new Error('Could not fetch subtitles. The video may not have subtitles available or they are disabled.');
    });

    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json({ 
        message: 'No subtitles found for this video'
      }, { status: 404 });
    }

    // Format transcript into a readable text
    const transcript = transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({ 
      transcript,
      videoTitle,
      videoId
    });
  } catch (error) {
    console.error('YouTube subtitles API error:', error);
    return NextResponse.json({ 
      message: error.message || 'Failed to fetch YouTube subtitles'
    }, { status: 500 });
  }
}
