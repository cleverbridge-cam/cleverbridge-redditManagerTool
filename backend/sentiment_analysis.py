import re
from typing import List, Dict
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

def analyze_sentiment(posts: List[Dict]) -> List[Dict]:
    """
    Adds sentiment analysis to each post dict. Expects 'title' and optionally 'body' keys.
    Returns the list with 'sentiment' and 'score' fields added.
    Uses VADER for more nuanced sentiment analysis.
    """
    analyzer = SentimentIntensityAnalyzer()
    for post in posts:
        text = post.get('title', '')
        if 'body' in post:
            text += ' ' + post['body']
        vs = analyzer.polarity_scores(text)
        polarity = vs['compound']
        if polarity > 0.05:
            sentiment = 'positive'
        elif polarity < -0.05:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        post['sentiment'] = sentiment
        post['score'] = polarity
        post['status'] = 'opportunity' if detect_opportunity(post) else 'neutral'
    return posts

def detect_opportunity(post: Dict) -> bool:
    """
    Returns True if the post contains opportunity-related keywords/phrases and is not negative.
    """
    opportunity_keywords = [
        "looking for payment solution", "need merchant of record", "recommend SaaS billing",
        "suggest payment provider", "best payment platform", "scaling payments", "international expansion",
        "how to sell globally", "MoR recommendation", "SaaS payment advice", "billing solution"
    ]
    text = (post.get('title', '') + ' ' + post.get('body', '')).lower()
    if post.get('sentiment') == 'negative':
        return False
    for kw in opportunity_keywords:
        if kw in text:
            return True
    return False

# Example usage:
# posts = [{"title": "I love Cleverbridge!"}, {"title": "Not a fan of this product."}]
# analyzed = analyze_sentiment(posts)
# print(analyzed)
