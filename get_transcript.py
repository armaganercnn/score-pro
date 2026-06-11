import sys
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=['tr', 'en'])
        full_text = "\n".join([f"{item.start:.1f}s: {item.text}" for item in transcript])
        print(full_text)
    except Exception as e:
        print(f"Error fetching transcript: {e}", file=sys.stderr)

if __name__ == "__main__":
    video_id = "TQhtUfE57s4"
    if len(sys.argv) > 1:
        video_id = sys.argv[1]
    get_transcript(video_id)
